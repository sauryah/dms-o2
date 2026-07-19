package cache

import (
	"bytes"
	"context"
	"testing"
	"time"

	"dms-go-api/internal/config"
)

func TestCacheOperations(t *testing.T) {
	cfg := &config.Config{
		RedisHost: "localhost",
		RedisPort: "6379",
	}

	c := NewCache(cfg)
	if !c.Enabled() {
		t.Skip("Redis is not running on localhost:6379, skipping integration test")
	}

	ctx := context.Background()

	// Test Set and Get
	key := "search:test_key"
	val := []byte("test_value")
	err := c.Set(ctx, key, val, 5*time.Second)
	if err != nil {
		t.Fatalf("failed to set cache: %v", err)
	}

	got, err := c.Get(ctx, key)
	if err != nil {
		t.Fatalf("failed to get cache: %v", err)
	}

	if !bytes.Equal(got, val) {
		t.Errorf("expected %q, got %q", val, got)
	}

	// Test Delete
	err = c.Delete(ctx, key)
	if err != nil {
		t.Fatalf("failed to delete key: %v", err)
	}

	_, err = c.Get(ctx, key)
	if err == nil {
		t.Errorf("expected key to be deleted, but it still exists")
	}

	// Test Invalidate
	err = c.Set(ctx, "stats", []byte("stats_val"), 5*time.Second)
	if err != nil {
		t.Fatalf("failed to set stats key: %v", err)
	}
	err = c.Set(ctx, "search:another_key", []byte("search_val"), 5*time.Second)
	if err != nil {
		t.Fatalf("failed to set search key: %v", err)
	}

	c.Invalidate(ctx)

	_, err = c.Get(ctx, "stats")
	if err == nil {
		t.Errorf("expected stats to be invalidated")
	}
	_, err = c.Get(ctx, "search:another_key")
	if err == nil {
		t.Errorf("expected search:another_key to be invalidated")
	}
}

func TestDisabledCache(t *testing.T) {
	c := &Cache{client: nil}
	if c.Enabled() {
		t.Error("expected cache to be disabled")
	}
	ctx := context.Background()
	_, err := c.Get(ctx, "key")
	if err == nil || err.Error() != "redis cache is disabled" {
		t.Errorf("expected error 'redis cache is disabled', got: %v", err)
	}
	err = c.Set(ctx, "key", []byte("val"), 0)
	if err == nil || err.Error() != "redis cache is disabled" {
		t.Errorf("expected error 'redis cache is disabled', got: %v", err)
	}
	err = c.Delete(ctx, "key")
	if err == nil || err.Error() != "redis cache is disabled" {
		t.Errorf("expected error 'redis cache is disabled', got: %v", err)
	}
	c.Invalidate(ctx)
}
