package search

import (
	"log"

	"github.com/meilisearch/meilisearch-go"
	"dms-go-api/internal/config"
)

type SearchClient struct {
	client    *meilisearch.Client
	indexName string
}

func NewSearchClient(cfg *config.Config) *SearchClient {
	client := meilisearch.NewClient(meilisearch.ClientConfig{
		Host:   cfg.MeiliHost,
		APIKey: cfg.MeiliSearchKey,
	})
	log.Printf("Meilisearch client initialized with host %s", cfg.MeiliHost)
	return &SearchClient{
		client:    client,
		indexName: "dies",
	}
}

func (s *SearchClient) IndexName() string {
	return s.indexName
}

func (s *SearchClient) GetStats() (int64, error) {
	stats, err := s.client.Index(s.indexName).GetStats()
	if err != nil {
		return 0, err
	}
	return stats.NumberOfDocuments, nil
}

func (s *SearchClient) Search(query string, searchRequest *meilisearch.SearchRequest) (*meilisearch.SearchResponse, error) {
	return s.client.Index(s.indexName).Search(query, searchRequest)
}
