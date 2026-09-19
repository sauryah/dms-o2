package cache

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"sync/atomic"
	"time"

	"dms-go-api/internal/config"
	"github.com/redis/go-redis/v9"
)

type Cache struct {
	client    *redis.Client
	searchGen atomic.Int64
}

func NewCache(cfg *config.Config) *Cache {
	addr := fmt.Sprintf("%s:%s", cfg.RedisHost, cfg.RedisPort)
	client := redis.NewClient(&redis.Options{
		Addr:         addr,
		Password:     cfg.RedisPassword,
		DB:           0,
		PoolSize:     100,
		MinIdleConns: 10,
		DialTimeout:  5 * time.Second,
		ReadTimeout:  3 * time.Second,
		WriteTimeout: 3 * time.Second,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	err := client.Ping(ctx).Err()
	if err != nil {
		slog.Warn("Failed to connect to Redis", "addr", addr, "error", err)
		return &Cache{client: nil}
	}

	slog.Info("Successfully connected to Redis", "addr", addr)
	c := &Cache{client: client}

	gen, err := client.Get(ctx, "search_cache_gen").Int64()
	if err != nil {
		gen = 1
		_ = client.Set(ctx, "search_cache_gen", 1, 0).Err()
	}
	c.searchGen.Store(gen)

	return c
}

func (c *Cache) Enabled() bool {
	return c.client != nil
}

func (c *Cache) resolveKey(ctx context.Context, key string) string {
	if !strings.HasPrefix(key, "search:") {
		return key
	}
	gen := c.searchGen.Load()
	if gen == 0 {
		if c.client != nil {
			val, err := c.client.Get(ctx, "search_cache_gen").Int64()
			if err != nil {
				gen = 1
				_ = c.client.Set(ctx, "search_cache_gen", 1, 0).Err()
			} else {
				gen = val
			}
			c.searchGen.Store(gen)
		} else {
			gen = 1
		}
	}
	return fmt.Sprintf("search:%d:%s", gen, key[7:])
}

func (c *Cache) Get(ctx context.Context, key string) ([]byte, error) {
	if c.client == nil {
		return nil, fmt.Errorf("redis cache is disabled")
	}
	return c.client.Get(ctx, c.resolveKey(ctx, key)).Bytes()
}

func (c *Cache) Set(ctx context.Context, key string, val []byte, expiration time.Duration) error {
	if c.client == nil {
		return fmt.Errorf("redis cache is disabled")
	}
	return c.client.Set(ctx, c.resolveKey(ctx, key), val, expiration).Err()
}

func (c *Cache) Invalidate(ctx context.Context) {
	if c.client == nil {
		return
	}

	// Delete stats:fresh key to mark stats cache as stale
	err := c.client.Del(ctx, "stats:fresh").Err()
	if err != nil {
		slog.Warn("Failed to delete stats:fresh cache key", "error", err)
	} else {
		slog.Info("Successfully invalidated stats cache (marked stale)")
	}

	// Invalidate search cache atomically in O(1) via generation counter
	newGen, err := c.client.Incr(ctx, "search_cache_gen").Result()
	if err != nil {
		slog.Warn("Failed to increment search_cache_gen", "error", err)
	} else {
		c.searchGen.Store(newGen)
		slog.Info("Successfully invalidated search cache via generation increment", "generation", newGen)
	}
}

func (c *Cache) Delete(ctx context.Context, key string) error {
	if c.client == nil {
		return fmt.Errorf("redis cache is disabled")
	}
	return c.client.Del(ctx, c.resolveKey(ctx, key)).Err()
}

func (c *Cache) Ping(ctx context.Context) error {
	if c.client == nil {
		return fmt.Errorf("redis cache is disabled")
	}
	return c.client.Ping(ctx).Err()
}

func (c *Cache) Publish(ctx context.Context, channel string, message string) error {
	if c.client == nil {
		return fmt.Errorf("redis cache is disabled")
	}
	return c.client.Publish(ctx, channel, message).Err()
}

func (c *Cache) Subscribe(ctx context.Context, channel string) *redis.PubSub {
	if c.client == nil {
		return nil
	}
	return c.client.Subscribe(ctx, channel)
}
