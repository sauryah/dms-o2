package events

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"sync"
	"time"

	"dms-go-api/internal/cache"
	"dms-go-api/internal/config"
	"github.com/lib/pq"
)

const RedisEventChannel = "dms:events:broadcast"

type Event struct {
	ID      int64  `json:"id"`
	Message string `json:"message"`
}

type Client chan Event

type EventManager struct {
	clients    map[Client]bool
	register   chan Client
	unregister chan Client
	broadcast  chan string
	mu         sync.RWMutex
	history    []Event
	nextID     int64
}

func NewEventManager() *EventManager {
	return &EventManager{
		clients:    make(map[Client]bool),
		register:   make(chan Client, 64),
		unregister: make(chan Client, 64),
		broadcast:  make(chan string, 256),
		history:    make([]Event, 0, 500),
		nextID:     1,
	}
}

func (m *EventManager) Start() {
	for {
		select {
		case client := <-m.register:
			m.mu.Lock()
			m.clients[client] = true
			slog.Info("SSE Client registered", "total_active", len(m.clients))
			m.mu.Unlock()
		case client := <-m.unregister:
			m.mu.Lock()
			if _, ok := m.clients[client]; ok {
				delete(m.clients, client)
				close(client)
				slog.Info("SSE Client unregistered", "total_active", len(m.clients))
			}
			m.mu.Unlock()
		case message := <-m.broadcast:
			m.mu.Lock()
			event := Event{
				ID:      m.nextID,
				Message: message,
			}
			m.nextID++
			if len(m.history) >= 500 {
				m.history = m.history[1:]
			}
			m.history = append(m.history, event)
			m.mu.Unlock()

			m.mu.RLock()
			var staleClients []Client
			for client := range m.clients {
				select {
				case client <- event:
				default:
					slog.Warn("SSE Client buffer full or blocked, unregistering client.")
					staleClients = append(staleClients, client)
				}
			}
			m.mu.RUnlock()

			for _, c := range staleClients {
				m.unregister <- c
			}
		}
	}
}

func (m *EventManager) Register(c Client) {
	m.register <- c
}

func (m *EventManager) Unregister(c Client) {
	m.unregister <- c
}

func (m *EventManager) Broadcast(msg string) {
	select {
	case m.broadcast <- msg:
	default:
		slog.Warn("Event broadcast queue full, skipping broadcast.")
	}
}

func (m *EventManager) Backfill(w io.Writer, flusher http.Flusher, lastID int64) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	for _, ev := range m.history {
		if ev.ID > lastID {
			fmt.Fprintf(w, "id: %d\ndata: %s\n\n", ev.ID, ev.Message)
		}
	}
	flusher.Flush()
}

func StartEventListener(cfg *config.Config, redisCache *cache.Cache, manager *EventManager, onNotify func()) {
	connStr := cfg.PostgresConnStr()

	reportProblem := func(ev pq.ListenerEventType, err error) {
		if err != nil {
			slog.Error("PostgreSQL Listener error", "error", err)
		}
	}

	listener := pq.NewListener(connStr, 10*time.Second, time.Minute, reportProblem)
	err := listener.Listen("dms_events")
	if err != nil {
		slog.Error("Failed to listen to dms_events", "error", err)
		return
	}

	// If Redis is enabled, subscribe to the distributed Pub/Sub channel
	if redisCache != nil && redisCache.Enabled() {
		go func() {
			ctx := context.Background()
			pubsub := redisCache.Subscribe(ctx, RedisEventChannel)
			if pubsub == nil {
				return
			}
			defer pubsub.Close()
			slog.Info("Subscribed to Redis Pub/Sub channel for multi-instance event sync", "channel", RedisEventChannel)
			ch := pubsub.Channel()
			for msg := range ch {
				if msg == nil {
					continue
				}
				slog.Info("Received distributed event from Redis Pub/Sub", "channel", msg.Channel, "payload", msg.Payload)
				onNotify()
				manager.Broadcast(msg.Payload)
			}
		}()
	}

	go func() {
		defer listener.Close()
		slog.Info("Listening for database notifications on channel dms_events")
		ticker := time.NewTicker(90 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case n := <-listener.Notify:
				if n == nil {
					continue
				}
				slog.Info("Received DB event from PostgreSQL", "event", n.Extra)
				if redisCache != nil && redisCache.Enabled() {
					ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
					pubErr := redisCache.Publish(ctx, RedisEventChannel, n.Extra)
					cancel()
					if pubErr != nil {
						slog.Warn("Failed to publish event to Redis Pub/Sub, broadcasting locally", "error", pubErr)
						onNotify()
						manager.Broadcast(n.Extra)
					}
				} else {
					onNotify()
					manager.Broadcast(n.Extra)
				}
			case <-ticker.C:
				go func() {
					err := listener.Ping()
					if err != nil {
						slog.Warn("PostgreSQL Listener ping failed", "error", err)
					}
				}()
			}
		}
	}()
}
