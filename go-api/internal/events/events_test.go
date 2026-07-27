package events

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestNewEventManager(t *testing.T) {
	m := NewEventManager()
	if m == nil {
		t.Fatal("Expected EventManager, got nil")
	}
	if m.clients == nil {
		t.Error("clients map not initialized")
	}
	if cap(m.history) != 500 {
		t.Errorf("history cap expected 500, got %d", cap(m.history))
	}
}

func TestRegisterUnregister(t *testing.T) {
	m := NewEventManager()
	go m.Start()

	c := make(Client, 10)
	m.Register(c)

	time.Sleep(50 * time.Millisecond)
	m.mu.RLock()
	if !m.clients[c] {
		t.Error("Client was not registered")
	}
	m.mu.RUnlock()

	m.Unregister(c)

	time.Sleep(50 * time.Millisecond)
	m.mu.RLock()
	if _, ok := m.clients[c]; ok {
		t.Error("Client was not unregistered")
	}
	m.mu.RUnlock()
}

func TestBroadcast(t *testing.T) {
	m := NewEventManager()
	go m.Start()

	c1 := make(Client, 10)
	c2 := make(Client, 10)

	m.Register(c1)
	m.Register(c2)
	time.Sleep(50 * time.Millisecond)

	m.Broadcast("test message")

	select {
	case ev := <-c1:
		if ev.Message != "test message" {
			t.Errorf("c1 got wrong message: %s", ev.Message)
		}
	case <-time.After(time.Second):
		t.Error("c1 did not receive message")
	}

	select {
	case ev := <-c2:
		if ev.Message != "test message" {
			t.Errorf("c2 got wrong message: %s", ev.Message)
		}
	case <-time.After(time.Second):
		t.Error("c2 did not receive message")
	}
}

func TestSlowClientUnregistered(t *testing.T) {
	m := NewEventManager()
	go m.Start()

	// Slow client with buffer 0
	c := make(Client, 0)
	m.Register(c)
	time.Sleep(50 * time.Millisecond)

	m.Broadcast("msg 1") // Should trigger unregistration because buffer is full (0 capacity and no one reading)

	time.Sleep(100 * time.Millisecond)
	m.mu.RLock()
	if _, ok := m.clients[c]; ok {
		t.Error("Slow client should have been unregistered")
	}
	m.mu.RUnlock()
}

type MockFlusher struct {
	w http.ResponseWriter
}

func (mf *MockFlusher) Flush() {}

func TestBackfill(t *testing.T) {
	m := NewEventManager()

	m.history = append(m.history, Event{ID: 1, Message: "msg1"})
	m.history = append(m.history, Event{ID: 2, Message: "msg2"})
	m.history = append(m.history, Event{ID: 3, Message: "msg3"})

	var buf bytes.Buffer
	rec := httptest.NewRecorder()
	mf := &MockFlusher{w: rec}

	m.Backfill(&buf, mf, 1)

	output := buf.String()
	if strings.Contains(output, "id: 1") {
		t.Error("Should not backfill id 1")
	}
	if !strings.Contains(output, "id: 2") || !strings.Contains(output, "msg2") {
		t.Error("Should backfill id 2")
	}
	if !strings.Contains(output, "id: 3") || !strings.Contains(output, "msg3") {
		t.Error("Should backfill id 3")
	}
}

func TestHistoryRingBuffer(t *testing.T) {
	m := NewEventManager()
	go m.Start()

	for i := 0; i < 510; i++ {
		m.Broadcast("test")
		time.Sleep(time.Millisecond)
	}

	time.Sleep(100 * time.Millisecond)

	m.mu.RLock()
	defer m.mu.RUnlock()
	if len(m.history) != 500 {
		t.Errorf("History should cap at 500, got %d", len(m.history))
	}
}

func TestBroadcastQueueFull(t *testing.T) {
	m := NewEventManager()
	// Do not start m to simulate blocked broadcast processor

	for i := 0; i < 300; i++ {
		m.Broadcast("test")
	}
}
