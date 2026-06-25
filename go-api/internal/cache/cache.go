package cache

import (
	"context"
	"fmt"
	"log"
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
		Addr:     addr,
		Password: "",
		DB:       0,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	err := client.Ping(ctx).Err()
	if err != nil {
		log.Printf("Warning: Failed to connect to Redis at %s: %v. Caching will be disabled.", addr, err)
		return &Cache{client: nil}
	}

	log.Printf("Successfully connected to Redis at %s.", addr)
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
			log.Printf("Warning: Failed to add key %s to cached_searches tracker: %v", key, errSAdd)
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
		log.Printf("Failed to delete stats cache: %v", err)
	} else {
		log.Println("Successfully invalidated 'stats' cache.")
	}

	// Retrieve all tracked search keys from the Set
	keys, err := c.client.SMembers(ctx, "cached_searches").Result()
	if err != nil {
		log.Printf("Failed to retrieve cached search keys from Set: %v", err)
		return
	}

	if len(keys) > 0 {
		err = c.client.Del(ctx, keys...).Err()
		if err != nil {
			log.Printf("Failed to delete tracked search cache keys: %v", err)
		} else {
			log.Printf("Successfully invalidated %d search cache keys.", len(keys))
		}
	}

	// Clear the tracker Set itself
	err = c.client.Del(ctx, "cached_searches").Err()
	if err != nil {
		log.Printf("Failed to delete cached_searches tracker Set: %v", err)
	}
}
