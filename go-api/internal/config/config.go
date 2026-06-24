package config

import (
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

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}

func Load() *Config {
	meiliKey := getEnv("MEILI_SEARCH_KEY", "")
	if meiliKey == "" {
		meiliKey = getEnv("MEILI_MASTER_KEY", "meili-master-key-secure-12345")
	}

	return &Config{
		Port:                        getEnv("PORT", "8080"),
		PostgresHost:                getEnv("POSTGRES_HOST", "db"),
		PostgresPort:                getEnv("POSTGRES_PORT", "5432"),
		PostgresUser:                getEnv("POSTGRES_USER", "dms_user"),
		PostgresPassword:            getEnv("POSTGRES_PASSWORD", "dms_pass_123"),
		PostgresDB:                  getEnv("POSTGRES_DB", "dms"),
		MeiliHost:                   getEnv("MEILI_HOST", "http://meilisearch:7700"),
		MeiliSearchKey:              meiliKey,
		RedisHost:                   getEnv("REDIS_HOST", "localhost"),
		RedisPort:                   getEnv("REDIS_PORT", "6379"),
		DjangoSecretKey:             getEnv("DJANGO_SECRET_KEY", "change_me"),
		SessionIdleTimeoutMinutes:   getEnv("SESSION_IDLE_TIMEOUT_MINUTES", "30"),
		SessionAbsoluteTimeoutHours: getEnv("SESSION_ABSOLUTE_TIMEOUT_HOURS", "12"),
	}
}
