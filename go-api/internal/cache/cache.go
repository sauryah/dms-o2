package cache

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/redis/go-redis/v9"
	"dms-go-api/internal/config"
)

type Cache struct {
	client *redis.Client
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
	return &Cache{client: client}
}

func (c *Cache) Enabled() bool {
	return c.client != nil
}

func (c *Cache) Get(ctx context.Context, key string) ([]byte, error) {
	if c.client == nil {
		return nil, fmt.Errorf("redis cache is disabled")
	}
	return c.client.Get(ctx, key).Bytes()
}

func (c *Cache) Set(ctx context.Context, key string, val []byte, expiration time.Duration) error {
	if c.client == nil {
		return fmt.Errorf("redis cache is disabled")
	}
	err := c.client.Set(ctx, key, val, expiration).Err()
	if err != nil {
		return err
	}
	if len(key) >= 7 && key[:7] == "search:" {
		errSAdd := c.client.SAdd(ctx, "cached_searches", key).Err()
		if errSAdd != nil {
			slog.Warn("Failed to add key to cached_searches tracker", "key", key, "error", errSAdd)
		}
	}
	return nil
}

func (c *Cache) Invalidate(ctx context.Context) {
	if c.client == nil {
		return
	}

	// Delete stats key
	err := c.client.Del(ctx, "stats").Err()
	if err != nil {
		slog.Warn("Failed to delete stats cache", "error", err)
	} else {
		slog.Info("Successfully invalidated stats cache")
	}

	// Retrieve all tracked search keys from the Set
	keys, err := c.client.SMembers(ctx, "cached_searches").Result()
	if err != nil {
		slog.Warn("Failed to retrieve cached search keys from Set", "error", err)
		return
	}

	if len(keys) > 0 {
		err = c.client.Del(ctx, keys...).Err()
		if err != nil {
			slog.Warn("Failed to delete tracked search cache keys", "error", err)
		} else {
			slog.Info("Successfully invalidated search cache keys", "count", len(keys))
		}
	}

	err = c.client.Del(ctx, "cached_searches").Err()
	if err != nil {
		slog.Warn("Failed to delete cached_searches tracker Set", "error", err)
	}
}

func (c *Cache) Delete(ctx context.Context, key string) error {
	if c.client == nil {
		return fmt.Errorf("redis cache is disabled")
	}
	return c.client.Del(ctx, key).Err()
}
