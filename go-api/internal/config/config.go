package config

import (
	"fmt"
	"os"
)

type Config struct {
	Port                        string
	PostgresHost                string
	PostgresPort                string
	PostgresUser                string
	PostgresPassword            string
	PostgresDB                  string
	MeiliHost                   string
	MeiliSearchKey              string
	MeiliMasterKey              string
	RedisHost                   string
	RedisPort                   string
	DjangoSecretKey             string
	SessionIdleTimeoutMinutes   string
	SessionAbsoluteTimeoutHours string
}

func Load() (*Config, error) {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	pgHost := os.Getenv("POSTGRES_HOST")
	if pgHost == "" {
		pgHost = "db"
	}

	pgPort := os.Getenv("POSTGRES_PORT")
	if pgPort == "" {
		pgPort = "5432"
	}

	pgUser := os.Getenv("POSTGRES_USER")
	if pgUser == "" {
		pgUser = "dms_user"
	}

	pgPass := os.Getenv("POSTGRES_PASSWORD")
	if pgPass == "" {
		return nil, fmt.Errorf("POSTGRES_PASSWORD environment variable is required")
	}

	pgDB := os.Getenv("POSTGRES_DB")
	if pgDB == "" {
		pgDB = "dms"
	}

	meiliHost := os.Getenv("MEILI_HOST")
	if meiliHost == "" {
		meiliHost = "http://meilisearch:7700"
	}

	meiliSearchKey := os.Getenv("MEILI_SEARCH_KEY")
	meiliMasterKey := os.Getenv("MEILI_MASTER_KEY")
	meiliKey := meiliSearchKey
	if meiliKey == "" {
		meiliKey = meiliMasterKey
	}

	if meiliKey == "" {
		return nil, fmt.Errorf("either MEILI_SEARCH_KEY or MEILI_MASTER_KEY environment variable is required")
	}

	redisHost := os.Getenv("REDIS_HOST")
	if redisHost == "" {
		redisHost = "localhost"
	}

	redisPort := os.Getenv("REDIS_PORT")
	if redisPort == "" {
		redisPort = "6379"
	}

	djangoSecret := os.Getenv("DJANGO_SECRET_KEY")
	if djangoSecret == "" {
		return nil, fmt.Errorf("DJANGO_SECRET_KEY environment variable is required")
	}

	sessionIdle := os.Getenv("SESSION_IDLE_TIMEOUT_MINUTES")
	if sessionIdle == "" {
		sessionIdle = "30"
	}

	sessionAbs := os.Getenv("SESSION_ABSOLUTE_TIMEOUT_HOURS")
	if sessionAbs == "" {
		sessionAbs = "12"
	}

	return &Config{
		Port:                        port,
		PostgresHost:                pgHost,
		PostgresPort:                pgPort,
		PostgresUser:                pgUser,
		PostgresPassword:            pgPass,
		PostgresDB:                  pgDB,
		MeiliHost:                   meiliHost,
		MeiliSearchKey:              meiliKey,
		RedisHost:                   redisHost,
		RedisPort:                   redisPort,
		DjangoSecretKey:             djangoSecret,
		SessionIdleTimeoutMinutes:   sessionIdle,
		SessionAbsoluteTimeoutHours: sessionAbs,
	}, nil
}

func (c *Config) PostgresConnStr() string {
	return fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		c.PostgresHost,
		c.PostgresPort,
		c.PostgresUser,
		c.PostgresPassword,
		c.PostgresDB,
	)
}
