package search

import (
	"testing"

	"dms-go-api/internal/config"
)

func TestNewSearchClient(t *testing.T) {
	cfg := &config.Config{
		MeiliHost:      "http://localhost:7700",
		MeiliSearchKey: "test_key",
	}

	client := NewSearchClient(cfg)
	if client == nil {
		t.Fatal("expected SearchClient instance, got nil")
	}

	if client.IndexName() != "dies" {
		t.Errorf("expected index name 'dies', got %s", client.IndexName())
	}
}

func TestSearchClientUnreachableHost(t *testing.T) {
	cfg := &config.Config{
		MeiliHost:      "http://127.0.0.1:9999", // dead port
		MeiliSearchKey: "test_key",
	}

	client := NewSearchClient(cfg)

	// GetStats should fail gracefully when host is unreachable
	_, err := client.GetStats()
	if err == nil {
		t.Error("expected error when Meilisearch host is unreachable")
	}
}
