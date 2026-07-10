package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/meilisearch/meilisearch-go"
	"dms-go-api/internal/config"
	"dms-go-api/internal/database"
)

// Mock definitions
type MockDatabase struct {
	GetStatsFn                   func(ctx context.Context) (map[string]int, int, error)
	QueryPostgresDirectlyFn      func(ctx context.Context, q, dieType, statusVal, location, casing, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax, machineID, setID, unassigned string, limit, offset int) ([]database.DieRepresentation, error)
	QueryPostgresDirectlyCountFn func(ctx context.Context, q, dieType, statusVal, location, casing, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax, machineID, setID, unassigned string) (int, error)
	QueryPostgresByIDsFn         func(ctx context.Context, hitIDs []int64, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax string) ([]database.DieRepresentation, error)
	GetCountFn                   func(ctx context.Context) (int, error)
	IsUserActiveFn               func(ctx context.Context, userID int) (bool, error)
}

func (m *MockDatabase) GetStats(ctx context.Context) (map[string]int, int, error) {
	if m.GetStatsFn != nil {
		return m.GetStatsFn(ctx)
	}
	return nil, 0, nil
}

func (m *MockDatabase) QueryPostgresDirectly(ctx context.Context, q, dieType, statusVal, location, casing, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax, machineID, setID, unassigned string, limit, offset int) ([]database.DieRepresentation, error) {
	if m.QueryPostgresDirectlyFn != nil {
		return m.QueryPostgresDirectlyFn(ctx, q, dieType, statusVal, location, casing, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax, machineID, setID, unassigned, limit, offset)
	}
	return nil, nil
}

func (m *MockDatabase) QueryPostgresDirectlyCount(ctx context.Context, q, dieType, statusVal, location, casing, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax, machineID, setID, unassigned string) (int, error) {
	if m.QueryPostgresDirectlyCountFn != nil {
		return m.QueryPostgresDirectlyCountFn(ctx, q, dieType, statusVal, location, casing, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax, machineID, setID, unassigned)
	}
	return 0, nil
}

func (m *MockDatabase) QueryPostgresByIDs(ctx context.Context, hitIDs []int64, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax string) ([]database.DieRepresentation, error) {
	if m.QueryPostgresByIDsFn != nil {
		return m.QueryPostgresByIDsFn(ctx, hitIDs, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax)
	}
	return nil, nil
}

func (m *MockDatabase) GetCount(ctx context.Context) (int, error) {
	if m.GetCountFn != nil {
		return m.GetCountFn(ctx)
	}
	return 0, nil
}

func (m *MockDatabase) IsUserActive(ctx context.Context, userID int) (bool, error) {
	if m.IsUserActiveFn != nil {
		return m.IsUserActiveFn(ctx, userID)
	}
	return true, nil
}

type MockCache struct {
	EnabledFn    func() bool
	GetFn        func(ctx context.Context, key string) ([]byte, error)
	SetFn        func(ctx context.Context, key string, val []byte, expiration time.Duration) error
	InvalidateFn func(ctx context.Context)
	DeleteFn     func(ctx context.Context, key string) error
}

func (m *MockCache) Enabled() bool {
	if m.EnabledFn != nil {
		return m.EnabledFn()
	}
	return false
}

func (m *MockCache) Get(ctx context.Context, key string) ([]byte, error) {
	if m.GetFn != nil {
		return m.GetFn(ctx, key)
	}
	return nil, errors.New("key not found")
}

func (m *MockCache) Set(ctx context.Context, key string, val []byte, expiration time.Duration) error {
	if m.SetFn != nil {
		return m.SetFn(ctx, key, val, expiration)
	}
	return nil
}

func (m *MockCache) Invalidate(ctx context.Context) {
	if m.InvalidateFn != nil {
		m.InvalidateFn(ctx)
	}
}

func (m *MockCache) Delete(ctx context.Context, key string) error {
	if m.DeleteFn != nil {
		return m.DeleteFn(ctx, key)
	}
	return nil
}

type MockSearch struct {
	GetStatsFn func() (int64, error)
	SearchFn   func(query string, searchRequest *meilisearch.SearchRequest) (*meilisearch.SearchResponse, error)
}

func (m *MockSearch) GetStats() (int64, error) {
	if m.GetStatsFn != nil {
		return m.GetStatsFn()
	}
	return 0, nil
}

func (m *MockSearch) Search(query string, searchRequest *meilisearch.SearchRequest) (*meilisearch.SearchResponse, error) {
	if m.SearchFn != nil {
		return m.SearchFn(query, searchRequest)
	}
	return nil, nil
}

func TestHandleHealth(t *testing.T) {
	cfg := &config.Config{}
	h := NewHandler(cfg, &MockDatabase{}, &MockCache{}, &MockSearch{}, nil)
	h.reconStatus = "in_sync"
	h.pgCount = 42
	h.meiliCount = 42
	h.lastRecon = time.Date(2026, 6, 24, 10, 0, 0, 0, time.UTC)

	req := httptest.NewRequest("GET", "/api/go/health", nil)
	w := httptest.NewRecorder()

	h.HandleHealth(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status OK, got %v", w.Code)
	}

	var resp map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}

	if resp["status"] != "ok" {
		t.Errorf("expected status 'ok', got %v", resp["status"])
	}

	recon, ok := resp["reconciliation"].(map[string]interface{})
	if !ok {
		t.Fatal("missing reconciliation field in response")
	}

	if recon["status"] != "in_sync" {
		t.Errorf("expected status 'in_sync', got %v", recon["status"])
	}
	if recon["postgres_count"].(float64) != 42 {
		t.Errorf("expected postgres_count 42, got %v", recon["postgres_count"])
	}
}

func TestHandleStats_CacheHit(t *testing.T) {
	cfg := &config.Config{}
	expectedStats := map[string]interface{}{
		"total": 10,
		"stats": map[string]int{"AVAILABLE": 10},
	}
	cachedBytes, _ := json.Marshal(expectedStats)

	mockCache := &MockCache{
		EnabledFn: func() bool { return true },
		GetFn: func(ctx context.Context, key string) ([]byte, error) {
			if key == "stats" {
				return cachedBytes, nil
			}
			return nil, errors.New("key not found")
		},
	}

	h := NewHandler(cfg, &MockDatabase{}, mockCache, &MockSearch{}, nil)

	req := httptest.NewRequest("GET", "/api/go/stats", nil)
	w := httptest.NewRecorder()

	h.HandleStats(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status OK, got %v", w.Code)
	}

	var resp map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}

	if resp["total"].(float64) != 10 {
		t.Errorf("expected total 10, got %v", resp["total"])
	}
}

func TestHandleStats_CacheMiss(t *testing.T) {
	cfg := &config.Config{}
	mockDb := &MockDatabase{
		GetStatsFn: func(ctx context.Context) (map[string]int, int, error) {
			return map[string]int{"AVAILABLE": 15}, 15, nil
		},
	}

	cacheSetCalled := false
	mockCache := &MockCache{
		EnabledFn: func() bool { return true },
		GetFn:     func(ctx context.Context, key string) ([]byte, error) { return nil, errors.New("miss") },
		SetFn: func(ctx context.Context, key string, val []byte, expiration time.Duration) error {
			if key == "stats" {
				cacheSetCalled = true
			}
			return nil
		},
	}

	h := NewHandler(cfg, mockDb, mockCache, &MockSearch{}, nil)

	req := httptest.NewRequest("GET", "/api/go/stats", nil)
	w := httptest.NewRecorder()

	h.HandleStats(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status OK, got %v", w.Code)
	}

	var resp map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}

	if resp["total"].(float64) != 15 {
		t.Errorf("expected total 15, got %v", resp["total"])
	}

	if !cacheSetCalled {
		t.Error("expected stats to be saved in cache on cache miss")
	}
}

func TestHandleSearch_DirectPostgres(t *testing.T) {
	cfg := &config.Config{}
	expectedDies := []database.DieRepresentation{
		{DieID: "ROUND-1", DieType: "ROUND", Status: "AVAILABLE"},
	}

	mockDb := &MockDatabase{
		QueryPostgresDirectlyFn: func(ctx context.Context, q, dieType, statusVal, location, casing, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax, machineID, setID, unassigned string, limit, offset int) ([]database.DieRepresentation, error) {
			if q == "" && dieType == "ROUND" {
				return expectedDies, nil
			}
			return nil, nil
		},
		QueryPostgresDirectlyCountFn: func(ctx context.Context, q, dieType, statusVal, location, casing, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax, machineID, setID, unassigned string) (int, error) {
			return 1, nil
		},
	}

	h := NewHandler(cfg, mockDb, &MockCache{}, &MockSearch{}, nil)

	req := httptest.NewRequest("GET", "/api/go/search?die_type=ROUND", nil)
	w := httptest.NewRecorder()

	h.HandleSearch(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status OK, got %v", w.Code)
	}

	var resp struct {
		Total   int                          `json:"total"`
		Limit   int                          `json:"limit"`
		Offset  int                          `json:"offset"`
		Results []database.DieRepresentation `json:"results"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}

	if len(resp.Results) != 1 || resp.Results[0].DieID != "ROUND-1" {
		t.Errorf("unexpected response content: %+v", resp)
	}
}

func TestHandleSearch_MeilisearchAndPostgres(t *testing.T) {
	cfg := &config.Config{}
	mockSearch := &MockSearch{
		SearchFn: func(query string, searchRequest *meilisearch.SearchRequest) (*meilisearch.SearchResponse, error) {
			if query == "ROUND" {
				return &meilisearch.SearchResponse{
					Hits: []interface{}{
						map[string]interface{}{"id": "101"},
					},
					TotalHits: 1,
				}, nil
			}
			return &meilisearch.SearchResponse{Hits: []interface{}{}}, nil
		},
	}

	mockDb := &MockDatabase{
		QueryPostgresByIDsFn: func(ctx context.Context, hitIDs []int64, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax string) ([]database.DieRepresentation, error) {
			if len(hitIDs) == 1 && hitIDs[0] == 101 {
				return []database.DieRepresentation{
					{ID: 101, DieID: "ROUND-101", DieType: "ROUND", Status: "AVAILABLE"},
				}, nil
			}
			return nil, nil
		},
	}

	h := NewHandler(cfg, mockDb, &MockCache{}, mockSearch, nil)

	req := httptest.NewRequest("GET", "/api/go/search?q=ROUND", nil)
	w := httptest.NewRecorder()

	h.HandleSearch(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status OK, got %v", w.Code)
	}

	var resp struct {
		Total   int                          `json:"total"`
		Limit   int                          `json:"limit"`
		Offset  int                          `json:"offset"`
		Results []database.DieRepresentation `json:"results"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}

	if len(resp.Results) != 1 || resp.Results[0].DieID != "ROUND-101" {
		t.Errorf("unexpected search response: %+v", resp)
	}
}

func TestRelevanceSorting(t *testing.T) {
	cfg := &config.Config{}

	// Setup candidates to be returned by mock DB
	size1600 := "1.600"
	size2500 := "2.500"
	
	candidates := []database.DieRepresentation{
		{ID: 1, DieID: "DIE-OTHER", DieType: "ROUND", CurrentSize: &size2500, Casing: "other-casing", MachineName: "machine-other"},
		{ID: 2, DieID: "DIE-EXACT-ID", DieType: "ROUND", CurrentSize: &size2500, Casing: "other-casing", MachineName: "machine-other"},
		{ID: 3, DieID: "DIE-SIZE-16", DieType: "ROUND", CurrentSize: &size1600, Casing: "other-casing", MachineName: "machine-other"},
		{ID: 4, DieID: "DIE-START-WITH-EXACT", DieType: "ROUND", CurrentSize: &size2500, Casing: "other-casing", MachineName: "machine-other"},
		{ID: 5, DieID: "DIE-CASING-MATCH", DieType: "ROUND", CurrentSize: &size2500, Casing: "casing-target", MachineName: "machine-other"},
	}

	mockDb := &MockDatabase{
		QueryPostgresDirectlyFn: func(ctx context.Context, q, dieType, statusVal, location, casing, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax, machineID, setID, unassigned string, limit, offset int) ([]database.DieRepresentation, error) {
			return candidates, nil
		},
		QueryPostgresByIDsFn: func(ctx context.Context, hitIDs []int64, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax string) ([]database.DieRepresentation, error) {
			return candidates, nil
		},
	}

	mockSearch := &MockSearch{
		SearchFn: func(query string, searchRequest *meilisearch.SearchRequest) (*meilisearch.SearchResponse, error) {
			return &meilisearch.SearchResponse{
				Hits: []interface{}{
					map[string]interface{}{"id": "1"},
					map[string]interface{}{"id": "2"},
					map[string]interface{}{"id": "3"},
					map[string]interface{}{"id": "4"},
					map[string]interface{}{"id": "5"},
				},
			}, nil
		},
	}

	h := NewHandler(cfg, mockDb, &MockCache{}, mockSearch, nil)

	// Test Case 1: Exact size match prioritization
	// When searching for "1.600", candidate 3 (DIE-SIZE-16, size: "1.600") should be first
	results, _, err := h.QueryMeilisearchAndPostgres(context.Background(), "1.600", "", "", "", "", "", "", "", "", "", "", "", "", "", 10, 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(results) == 0 || results[0].DieID != "DIE-SIZE-16" {
		t.Errorf("expected DIE-SIZE-16 to be ranked first for size query, got: %+v", results)
	}

	// Test Case 2: Exact size match normalized
	// Searching "1.6" should also rank DIE-SIZE-16 first
	results, _, err = h.QueryMeilisearchAndPostgres(context.Background(), "1.6", "", "", "", "", "", "", "", "", "", "", "", "", "", 10, 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(results) == 0 || results[0].DieID != "DIE-SIZE-16" {
		t.Errorf("expected DIE-SIZE-16 to be ranked first for normalized size query, got: %+v", results)
	}

	// Test Case 3: Exact die_id match prioritization
	// When searching for "DIE-EXACT-ID", candidate 2 should be first
	results, _, err = h.QueryMeilisearchAndPostgres(context.Background(), "DIE-EXACT-ID", "", "", "", "", "", "", "", "", "", "", "", "", "", 10, 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(results) == 0 || results[0].DieID != "DIE-EXACT-ID" {
		t.Errorf("expected DIE-EXACT-ID to be ranked first, got: %+v", results)
	}

	// Test Case 4: Starts-with match prioritization
	// When searching for "DIE-START", candidate 4 (DIE-START-WITH-EXACT) should be ranked first because "DIE-START-WITH-EXACT" prefix matches.
	results, _, err = h.QueryMeilisearchAndPostgres(context.Background(), "DIE-START", "", "", "", "", "", "", "", "", "", "", "", "", "", 10, 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(results) == 0 || results[0].DieID != "DIE-START-WITH-EXACT" {
		t.Errorf("expected DIE-START-WITH-EXACT to be ranked first, got: %+v", results)
	}

	// Test Case 5: Casing / attribute match
	// When searching for "casing-target", candidate 5 (DIE-CASING-MATCH) should be ranked higher than other unrelated candidates
	results, _, err = h.QueryMeilisearchAndPostgres(context.Background(), "casing-target", "", "", "", "", "", "", "", "", "", "", "", "", "", 10, 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(results) == 0 || results[0].DieID != "DIE-CASING-MATCH" {
		t.Errorf("expected DIE-CASING-MATCH to be ranked first for casing query, got: %+v", results)
	}
}

func TestHandleSearch_PaginationParams(t *testing.T) {
	cfg := &config.Config{}
	
	mockDb := &MockDatabase{
		QueryPostgresDirectlyFn: func(ctx context.Context, q, dieType, statusVal, location, casing, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax, machineID, setID, unassigned string, limit, offset int) ([]database.DieRepresentation, error) {
			if limit == 10 && offset == 20 {
				return []database.DieRepresentation{
					{DieID: "PAGINATED-DIE"},
				}, nil
			}
			return nil, nil
		},
		QueryPostgresDirectlyCountFn: func(ctx context.Context, q, dieType, statusVal, location, casing, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax, machineID, setID, unassigned string) (int, error) {
			return 100, nil
		},
	}

	h := NewHandler(cfg, mockDb, &MockCache{}, &MockSearch{}, nil)

	req := httptest.NewRequest("GET", "/api/go/search?limit=10&offset=20", nil)
	w := httptest.NewRecorder()

	h.HandleSearch(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status OK, got %v", w.Code)
	}

	var resp struct {
		Total   int                          `json:"total"`
		Limit   int                          `json:"limit"`
		Offset  int                          `json:"offset"`
		Results []database.DieRepresentation `json:"results"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}

	if resp.Total != 100 || resp.Limit != 10 || resp.Offset != 20 {
		t.Errorf("unexpected pagination response metadata: %+v", resp)
	}

	if len(resp.Results) != 1 || resp.Results[0].DieID != "PAGINATED-DIE" {
		t.Errorf("unexpected results payload: %+v", resp.Results)
	}
}

func TestScoreDie(t *testing.T) {
	size2_5 := "2.5"
	tests := []struct {
		name     string
		die      database.DieRepresentation
		query    string
		expected int
	}{
		{
			name: "Exact size match",
			die: database.DieRepresentation{
				DieID:   "R-101",
				DieType: "ROUND",
				CurrentSize: &size2_5,
			},
			query: "2.5",
			expected: 100,
		},
		{
			name: "Exact size match normalized mm",
			die: database.DieRepresentation{
				DieID:   "R-101",
				DieType: "ROUND",
				CurrentSize: &size2_5,
			},
			query: "2.5mm",
			expected: 50,
		},
		{
			name: "Exact die_id match",
			die: database.DieRepresentation{
				DieID: "R-101",
			},
			query: "R-101",
			expected: 90,
		},
		{
			name: "Exact die_id match mixed case",
			die: database.DieRepresentation{
				DieID: "R-101",
			},
			query: "r-101",
			expected: 90,
		},
		{
			name: "die_id prefix match",
			die: database.DieRepresentation{
				DieID: "R-101",
			},
			query: "R-10",
			expected: 80,
		},
		{
			name: "Substring location match",
			die: database.DieRepresentation{
				DieID: "R-101",
				Location: "Rack A - Shelf 3",
			},
			query: "Rack A",
			expected: 70,
		},
		{
			name: "Substring set match",
			die: database.DieRepresentation{
				DieID: "R-101",
				SetName: "Alpha Set",
			},
			query: "Alpha",
			expected: 70,
		},
		{
			name: "Substring casing match",
			die: database.DieRepresentation{
				DieID: "R-101",
				Casing: "Steel Casing",
			},
			query: "Steel",
			expected: 70,
		},
		{
			name: "Fuzzy match baseline",
			die: database.DieRepresentation{
				DieID: "R-101",
			},
			query: "abc", // query has no digits, allowed fuzzy match
			expected: 50,
		},
		{
			name: "Digit-containing query fuzzy match",
			die: database.DieRepresentation{
				DieID: "R-101",
			},
			query: "abc1", // scoreDie itself scores 50, discarded later in QueryMeilisearchAndPostgres
			expected: 50,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			score := scoreDie(tt.die, tt.query)
			if score != tt.expected {
				t.Errorf("expected score %d, got %d for query %q", tt.expected, score, tt.query)
			}
		})
	}
}

func TestHandleIndexStatus(t *testing.T) {
	cfg := &config.Config{}

	// Test 1: Cache disabled (defaults to ready)
	mockDb := &MockDatabase{}
	mockCache := &MockCache{
		EnabledFn: func() bool { return false },
	}
	h := NewHandler(cfg, mockDb, mockCache, &MockSearch{}, nil)

	req := httptest.NewRequest("GET", "/api/go/index-status", nil)
	w := httptest.NewRecorder()
	h.HandleIndexStatus(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status OK, got %d", w.Code)
	}
	if !strings.Contains(w.Body.String(), "ready") {
		t.Errorf("expected ready response, got %s", w.Body.String())
	}

	// Test 2: Cache enabled and has value
	mockCacheEnabled := &MockCache{
		EnabledFn: func() bool { return true },
		GetFn: func(ctx context.Context, key string) ([]byte, error) {
			if key == "search_index_status" {
				return []byte(`{"status":"rebuilding","progress":45}`), nil
			}
			return nil, errors.New("not found")
		},
	}
	h2 := NewHandler(cfg, mockDb, mockCacheEnabled, &MockSearch{}, nil)

	req2 := httptest.NewRequest("GET", "/api/go/index-status", nil)
	w2 := httptest.NewRecorder()
	h2.HandleIndexStatus(w2, req2)

	if w2.Code != http.StatusOK {
		t.Errorf("expected status OK, got %d", w2.Code)
	}
	if !strings.Contains(w2.Body.String(), "rebuilding") {
		t.Errorf("expected rebuilding response, got %s", w2.Body.String())
	}
}

func TestHandleStats(t *testing.T) {
	cfg := &config.Config{}
	mockDb := &MockDatabase{
		GetStatsFn: func(ctx context.Context) (map[string]int, int, error) {
			return map[string]int{"ROUND": 10, "FLAT": 5}, 15, nil
		},
	}

	// Test 1: Cache enabled and has value
	mockCache := &MockCache{
		EnabledFn: func() bool { return true },
		GetFn: func(ctx context.Context, key string) ([]byte, error) {
			if key == "stats" {
				return []byte(`{"cached":true}`), nil
			}
			return nil, errors.New("not found")
		},
	}

	h := NewHandler(cfg, mockDb, mockCache, &MockSearch{}, nil)

	req := httptest.NewRequest("GET", "/api/go/stats", nil)
	w := httptest.NewRecorder()
	h.HandleStats(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status OK, got %d", w.Code)
	}
	if !strings.Contains(w.Body.String(), "cached") {
		t.Errorf("expected cached stats response, got %s", w.Body.String())
	}

	// Test 2: Cache disabled, falls back to DB query
	mockCacheDisabled := &MockCache{
		EnabledFn: func() bool { return false },
	}
	h2 := NewHandler(cfg, mockDb, mockCacheDisabled, &MockSearch{}, nil)

	req2 := httptest.NewRequest("GET", "/api/go/stats", nil)
	w2 := httptest.NewRecorder()
	h2.HandleStats(w2, req2)

	if w2.Code != http.StatusOK {
		t.Errorf("expected status OK, got %d", w2.Code)
	}
	if !strings.Contains(w2.Body.String(), "ROUND") {
		t.Errorf("expected db query stats response, got %s", w2.Body.String())
	}
}

func TestHandleSearch_MeilisearchFailureFallback(t *testing.T) {
	cfg := &config.Config{}
	
	// Mock Meilisearch to return an error (e.g. timeout or server down)
	mockSearch := &MockSearch{
		SearchFn: func(query string, searchRequest *meilisearch.SearchRequest) (*meilisearch.SearchResponse, error) {
			return nil, errors.New("meilisearch connection timeout")
		},
	}

	// Mock DB to return Postgres direct results
	expectedDies := []database.DieRepresentation{
		{DieID: "POSTGRES-FALLBACK-1", DieType: "ROUND", Status: "AVAILABLE"},
	}
	postgresDirectlyCalled := false

	mockDb := &MockDatabase{
		QueryPostgresDirectlyFn: func(ctx context.Context, q, dieType, statusVal, location, casing, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax, machineID, setID, unassigned string, limit, offset int) ([]database.DieRepresentation, error) {
			if q == "fallback-query" {
				postgresDirectlyCalled = true
				return expectedDies, nil
			}
			return nil, nil
		},
		QueryPostgresDirectlyCountFn: func(ctx context.Context, q, dieType, statusVal, location, casing, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax, machineID, setID, unassigned string) (int, error) {
			return 1, nil
		},
	}

	h := NewHandler(cfg, mockDb, &MockCache{}, mockSearch, nil)

	req := httptest.NewRequest("GET", "/api/go/search?q=fallback-query", nil)
	w := httptest.NewRecorder()

	h.HandleSearch(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status OK, got %v", w.Code)
	}

	var resp struct {
		Total   int                          `json:"total"`
		Limit   int                          `json:"limit"`
		Offset  int                          `json:"offset"`
		Results []database.DieRepresentation `json:"results"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}

	if !postgresDirectlyCalled {
		t.Error("expected Postgres direct fallback query to be called on Meilisearch error")
	}

	if len(resp.Results) != 1 || resp.Results[0].DieID != "POSTGRES-FALLBACK-1" {
		t.Errorf("expected fallback result POSTGRES-FALLBACK-1, got: %+v", resp.Results)
	}
}


