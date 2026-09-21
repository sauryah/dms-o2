package events

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
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
		register:   make(chan Client, 256),
		unregister: make(chan Client, 256),
		broadcast:  make(chan string, 512),
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
					slog.Warn("SSE Client buffer full or blocked, queuing client for removal.")
					staleClients = append(staleClients, client)
				}
			}
			m.mu.RUnlock()

			if len(staleClients) > 0 {
				m.mu.Lock()
				for _, c := range staleClients {
					if _, ok := m.clients[c]; ok {
						delete(m.clients, c)
						close(c)
						slog.Info("SSE Client unregistered due to slow consumption", "total_active", len(m.clients))
					}
				}
				m.mu.Unlock()
			}
		}
	}
}

func (m *EventManager) Register(c Client) {
	m.register <- c
}

func (m *EventManager) Unregister(c Client) {
	select {
	case m.unregister <- c:
	default:
		slog.Warn("EventManager unregister channel full, dropping unregister request")
	}
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

func (m *EventManager) ActiveClientCount() int {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return len(m.clients)
}

// Deduplicator suppresses duplicate event payloads within a sliding time window.
type Deduplicator struct {
	mu     sync.Mutex
	seen   map[string]time.Time
	window time.Duration
}

// NewDeduplicator creates a new Deduplicator with the specified time window.
func NewDeduplicator(window time.Duration) *Deduplicator {
	return &Deduplicator{
		seen:   make(map[string]time.Time),
		window: window,
	}
}

// ShouldProcess returns true if the payload has not been processed within the sliding window.
func (d *Deduplicator) ShouldProcess(payload string) bool {
	d.mu.Lock()
	defer d.mu.Unlock()

	now := time.Now()
	if lastSeen, ok := d.seen[payload]; ok {
		if now.Sub(lastSeen) < d.window {
			return false
		}
	}

	if len(d.seen) > 1000 {
		for k, t := range d.seen {
			if now.Sub(t) > d.window*2 {
				delete(d.seen, k)
			}
		}
	}

	d.seen[payload] = now
	return true
}

func StartEventListener(cfg *config.Config, redisCache *cache.Cache, manager *EventManager, onNotify func()) {
	connStr := cfg.PostgresConnStr()
	dedup := NewDeduplicator(2 * time.Second)

	processEvent := func(source, payload string) {
		if !dedup.ShouldProcess(payload) {
			slog.Debug("Duplicate event suppressed", "source", source, "payload", payload)
			return
		}
		slog.Info("Processing event", "source", source, "payload", payload)
		if source == "postgres" || (source == "redis" && !strings.Contains(payload, "MACHINE_TELEMETRY")) {
			onNotify()
		}
		manager.Broadcast(payload)
	}

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

	// If Redis is enabled, subscribe to the distributed Pub/Sub channel for external broadcasts
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
				slog.Info("Received distributed event from Redis Pub/Sub", "channel", msg.Channel)
				processEvent("redis", msg.Payload)
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
				slog.Info("Received DB event from PostgreSQL", "channel", n.Channel)
				processEvent("postgres", n.Extra)
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
