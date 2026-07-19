package config

import (
	"os"
	"testing"
)

func TestConfigLoadDefaults(t *testing.T) {
	// Clean env
	os.Clearenv()

	// Set required variables
	os.Setenv("POSTGRES_PASSWORD", "db_secret_password")
	os.Setenv("MEILI_MASTER_KEY", "meili_secret_key")
	os.Setenv("DJANGO_SECRET_KEY", "django-insecure-development-secret-key-12345")
	os.Setenv("INTERNAL_API_SECRET", "dms_internal_secret_default_key_998_longer")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("expected no error loading config, got: %v", err)
	}

	if cfg.Port != "8080" {
		t.Errorf("expected default Port 8080, got %s", cfg.Port)
	}
	if cfg.PostgresHost != "db" {
		t.Errorf("expected default PostgresHost db, got %s", cfg.PostgresHost)
	}
	if cfg.PostgresPort != "5432" {
		t.Errorf("expected default PostgresPort 5432, got %s", cfg.PostgresPort)
	}
	if cfg.PostgresUser != "dms_user" {
		t.Errorf("expected default PostgresUser dms_user, got %s", cfg.PostgresUser)
	}
	if cfg.PostgresDB != "dms" {
		t.Errorf("expected default PostgresDB dms, got %s", cfg.PostgresDB)
	}
	if cfg.SearchCacheTTLSeconds != 10 {
		t.Errorf("expected default SearchCacheTTLSeconds 10, got %d", cfg.SearchCacheTTLSeconds)
	}

	connStr := cfg.PostgresConnStr()
	expectedConn := "host=db port=5432 user=dms_user password=db_secret_password dbname=dms sslmode=disable"
	if connStr != expectedConn {
		t.Errorf("expected conn str %q, got %q", expectedConn, connStr)
	}
}

func TestConfigMissingRequired(t *testing.T) {
	os.Clearenv()

	_, err := Load()
	if err == nil {
		t.Error("expected error due to missing POSTGRES_PASSWORD")
	}

	os.Setenv("POSTGRES_PASSWORD", "pass")
	_, err = Load()
	if err == nil {
		t.Error("expected error due to missing MEILI_MASTER_KEY")
	}

	os.Setenv("MEILI_MASTER_KEY", "key")
	_, err = Load()
	if err == nil {
		t.Error("expected error due to missing DJANGO_SECRET_KEY")
	}

	os.Setenv("DJANGO_SECRET_KEY", "secret")
	_, err = Load()
	if err == nil {
		t.Error("expected error due to missing INTERNAL_API_SECRET")
	}

	os.Setenv("INTERNAL_API_SECRET", "short")
	_, err = Load()
	if err == nil {
		t.Error("expected error due to short INTERNAL_API_SECRET")
	}
}

func TestConfigProductionChecks(t *testing.T) {
	os.Clearenv()
	os.Setenv("DJANGO_DEBUG", "False")
	os.Setenv("POSTGRES_PASSWORD", "db_secret_password")
	os.Setenv("MEILI_MASTER_KEY", "meili_secret_key")
	os.Setenv("DJANGO_SECRET_KEY", "django-insecure-development-secret-key-12345")
	os.Setenv("INTERNAL_API_SECRET", "dms_internal_secret_default_key_998")

	// 1. Should fail on insecure django secret
	_, err := Load()
	if err == nil || err.Error() != "insecure DJANGO_SECRET_KEY detected in production" {
		t.Errorf("expected insecure DJANGO_SECRET_KEY error, got: %v", err)
	}

	// Fix django secret, should fail on insecure postgres password
	os.Setenv("DJANGO_SECRET_KEY", "secure-django-secret-key-9999999999")
	_, err = Load()
	if err == nil || err.Error() != "insecure POSTGRES_PASSWORD detected in production" {
		t.Errorf("expected insecure POSTGRES_PASSWORD error, got: %v", err)
	}

	// Fix postgres password, should fail on insecure meili key
	os.Setenv("POSTGRES_PASSWORD", "secure-postgres-password-12345678")
	_, err = Load()
	if err == nil || err.Error() != "insecure MEILI_MASTER_KEY/MEILI_SEARCH_KEY detected in production" {
		t.Errorf("expected insecure MEILI_MASTER_KEY/MEILI_SEARCH_KEY error, got: %v", err)
	}

	// Fix meili key, should fail on insecure internal api secret
	os.Setenv("MEILI_MASTER_KEY", "secure-meili-master-key-12345678")
	_, err = Load()
	if err == nil || err.Error() != "insecure INTERNAL_API_SECRET detected in production" {
		t.Errorf("expected insecure INTERNAL_API_SECRET error, got: %v", err)
	}

	// Fix internal secret, should succeed
	os.Setenv("INTERNAL_API_SECRET", "secure-internal-api-secret-12345678")
	_, err = Load()
	if err != nil {
		t.Fatalf("expected success with secure credentials, got error: %v", err)
	}
}
