package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/meilisearch/meilisearch-go"
	"dms-go-api/internal/auth"
	"dms-go-api/internal/cache"
	"dms-go-api/internal/config"
	"dms-go-api/internal/database"
	"dms-go-api/internal/events"
	"dms-go-api/internal/search"
)

type Handler struct {
	cfg          *config.Config
	db           *database.PostgresDB
	cache        *cache.Cache
	search       *search.SearchClient
	eventManager *events.EventManager

	reconMu      sync.RWMutex
	lastRecon    time.Time
	reconStatus  string
	pgCount      int
	meiliCount   int
}

func NewHandler(
	cfg *config.Config,
	db *database.PostgresDB,
	c *cache.Cache,
	s *search.SearchClient,
	em *events.EventManager,
) *Handler {
	return &Handler{
		cfg:          cfg,
		db:           db,
		cache:        c,
		search:       s,
		eventManager: em,
		reconStatus:  "pending",
	}
}

func (h *Handler) HandleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	h.reconMu.RLock()
	lastRun := h.lastRecon
	status := h.reconStatus
	pgCnt := h.pgCount
	mCnt := h.meiliCount
	h.reconMu.RUnlock()

	resp := map[string]interface{}{
		"status": "ok",
		"reconciliation": map[string]interface{}{
			"last_run":       lastRun.Format(time.RFC3339),
			"status":         status,
			"postgres_count": pgCnt,
			"meili_count":    mCnt,
		},
	}
	json.NewEncoder(w).Encode(resp)
}

func (h *Handler) HandleStats(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// Try to fetch from Redis
	if h.cache.Enabled() {
		cachedBytes, err := h.cache.Get(r.Context(), "stats")
		if err == nil {
			w.WriteHeader(http.StatusOK)
			w.Write(cachedBytes)
			return
		}
	}

	queryCtx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	stats, total, err := h.db.GetStats(queryCtx)
	if err != nil {
		log.Printf("Failed to query statistics: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	response := map[string]interface{}{
		"total": total,
		"stats": stats,
	}

	respBytes, err := json.Marshal(response)
	if err != nil {
		log.Printf("Failed to marshal stats response: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	// Cache in Redis for 15 seconds
	if h.cache.Enabled() {
		err = h.cache.Set(r.Context(), "stats", respBytes, 15*time.Second)
		if err != nil {
			log.Printf("Warning: Failed to save stats to Redis: %v", err)
		}
	}

	w.WriteHeader(http.StatusOK)
	w.Write(respBytes)
}

func validateFloatParam(s string) bool {
	if s == "" {
		return true
	}
	_, err := strconv.ParseFloat(s, 64)
	return err == nil
}

func (h *Handler) HandleSearch(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// Parse query params
	q := r.URL.Query().Get("q")
	dieType := r.URL.Query().Get("die_type")
	statusVal := r.URL.Query().Get("status")
	location := r.URL.Query().Get("location")
	casing := r.URL.Query().Get("casing")

	sizeMin := r.URL.Query().Get("size_min")
	sizeMax := r.URL.Query().Get("size_max")
	widthMin := r.URL.Query().Get("width_min")
	widthMax := r.URL.Query().Get("width_max")
	thickMin := r.URL.Query().Get("thick_min")
	thickMax := r.URL.Query().Get("thick_max")

	limitStr := r.URL.Query().Get("limit")
	limit := 150
	if limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	// Validate numeric query parameters
	if !validateFloatParam(sizeMin) || !validateFloatParam(sizeMax) ||
		!validateFloatParam(widthMin) || !validateFloatParam(widthMax) ||
		!validateFloatParam(thickMin) || !validateFloatParam(thickMax) {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid decimal parameter format"})
		return
	}

	cacheKey := fmt.Sprintf("search:%s:%s:%s:%s:%s:%s:%s:%s:%s:%s:%s:%d",
		q, dieType, statusVal, location, casing,
		sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax, limit,
	)

	// Try to fetch from Redis
	if h.cache.Enabled() {
		cachedBytes, err := h.cache.Get(r.Context(), cacheKey)
		if err == nil {
			w.WriteHeader(http.StatusOK)
			w.Write(cachedBytes)
			return
		}
	}

	var dies []database.DieRepresentation
	var err error

	if q == "" {
		// 1. Direct database query
		dies, err = h.db.QueryPostgresDirectly(r.Context(), "", dieType, statusVal, location, casing, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax, limit)
	} else {
		// 2. Query Meilisearch first, then database
		dies, err = h.QueryMeilisearchAndPostgres(r.Context(), q, dieType, statusVal, location, casing, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax, limit)
	}

	if err != nil {
		log.Printf("Search query failed: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	if dies == nil {
		dies = []database.DieRepresentation{}
	}

	respBytes, err := json.Marshal(dies)
	if err != nil {
		log.Printf("Failed to marshal search response: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	// Cache in Redis for 10 seconds
	if h.cache.Enabled() {
		err = h.cache.Set(r.Context(), cacheKey, respBytes, 10*time.Second)
		if err != nil {
			log.Printf("Warning: Failed to save search results to Redis: %v", err)
		}
	}

	w.WriteHeader(http.StatusOK)
	w.Write(respBytes)
}

func escapeMeiliString(s string) string {
	return strings.ReplaceAll(s, "'", "\\'")
}

func (h *Handler) QueryMeilisearchAndPostgres(ctx context.Context, q, dieType, statusVal, location, casing, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax string, limit int) ([]database.DieRepresentation, error) {
	// Build Meilisearch filters
	var filters []string
	if dieType != "" {
		filters = append(filters, fmt.Sprintf("die_type = '%s'", escapeMeiliString(dieType)))
	}
	if statusVal != "" {
		filters = append(filters, fmt.Sprintf("status = '%s'", escapeMeiliString(statusVal)))
	}
	if location != "" {
		filters = append(filters, fmt.Sprintf("location = '%s'", escapeMeiliString(location)))
	}
	if casing != "" {
		filters = append(filters, fmt.Sprintf("casing = '%s'", escapeMeiliString(casing)))
	}

	// Numeric range filters in Meilisearch
	if sizeMin != "" {
		filters = append(filters, fmt.Sprintf("size >= %s", sizeMin))
	}
	if sizeMax != "" {
		filters = append(filters, fmt.Sprintf("size <= %s", sizeMax))
	}
	if widthMin != "" {
		filters = append(filters, fmt.Sprintf("width >= %s", widthMin))
	}
	if widthMax != "" {
		filters = append(filters, fmt.Sprintf("width <= %s", widthMax))
	}
	if thickMin != "" {
		filters = append(filters, fmt.Sprintf("thickness >= %s", thickMin))
	}
	if thickMax != "" {
		filters = append(filters, fmt.Sprintf("thickness <= %s", thickMax))
	}

	searchParams := meilisearch.SearchRequest{
		Limit: int64(limit),
	}
	if len(filters) > 0 {
		searchParams.Filter = strings.Join(filters, " AND ")
	}

	log.Printf("QueryMeilisearchAndPostgres: executing search for %q with filters: %q", q, searchParams.Filter)
	// Search Meilisearch index
	res, err := h.search.Search(q, &searchParams)
	if err != nil {
		log.Printf("Meilisearch search error: %v. Falling back to DB search.", err)
		return h.db.QueryPostgresDirectly(ctx, q, dieType, statusVal, location, casing, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax, limit)
	}
	log.Printf("QueryMeilisearchAndPostgres: Meilisearch returned %d hits for query %q", len(res.Hits), q)

	if len(res.Hits) == 0 {
		return []database.DieRepresentation{}, nil
	}

	// Extract matching document IDs
	var hitIDs []int64
	for _, hit := range res.Hits {
		if hitMap, ok := hit.(map[string]interface{}); ok {
			if idVal, ok := hitMap["id"].(string); ok {
				if parsedID, err := strconv.ParseInt(idVal, 10, 64); err == nil {
					hitIDs = append(hitIDs, parsedID)
				}
			}
		}
	}

	if len(hitIDs) == 0 {
		return []database.DieRepresentation{}, nil
	}

	// Fetch detail records from Postgres
	dies, err := h.db.QueryPostgresByIDs(ctx, hitIDs, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax)
	if err != nil {
		return nil, err
	}

	// Reorder dies according to Meilisearch hit order
	dieMap := make(map[int64]database.DieRepresentation)
	for _, die := range dies {
		dieMap[die.ID] = die
	}

	var orderedDies []database.DieRepresentation
	for _, hid := range hitIDs {
		if die, ok := dieMap[hid]; ok {
			orderedDies = append(orderedDies, die)
		}
	}

	return orderedDies, nil
}

func (h *Handler) HandleEvents(w http.ResponseWriter, r *http.Request) {
	// Require authentication: check if user_id is set in request context
	userID := r.Context().Value(auth.UserContextKey)
	if userID == nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Authentication token is required or session expired"})
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")

	// Create SSE connection channel
	clientChan := make(events.Client, 10)
	h.eventManager.Register(clientChan)

	defer func() {
		h.eventManager.Unregister(clientChan)
	}()

	flusher, ok := w.(http.Flusher)
	if !ok {
		log.Println("Streaming unsupported by web server")
		return
	}

	// Send connection established event
	fmt.Fprintf(w, "event: connected\ndata: {}\n\n")
	flusher.Flush()

	// Keep alive ticker
	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case msg, ok := <-clientChan:
			if !ok {
				return
			}
			fmt.Fprintf(w, "data: %s\n\n", msg)
			flusher.Flush()
		case <-ticker.C:
			fmt.Fprintf(w, ": keepalive\n\n")
			flusher.Flush()
		case <-r.Context().Done():
			return
		}
	}
}

func (h *Handler) RunReconciliation() {
	log.Println("Starting Search Index Reconciliation...")

	queryCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// 1. Get Postgres count
	pgCount, err := h.db.GetCount(queryCtx)
	if err != nil {
		log.Printf("Reconciliation error: Failed to count Postgres records: %v", err)
		h.reconMu.Lock()
		h.reconStatus = "error_postgres"
		h.lastRecon = time.Now()
		h.reconMu.Unlock()
		return
	}

	// 2. Get Meilisearch count
	mCountVal, err := h.search.GetStats()
	if err != nil {
		log.Printf("Reconciliation error: Failed to get Meilisearch stats: %v", err)
		h.reconMu.Lock()
		h.reconStatus = "error_meilisearch"
		h.lastRecon = time.Now()
		h.reconMu.Unlock()
		return
	}
	mCount := int(mCountVal)

	// 3. Update status
	h.reconMu.Lock()
	h.pgCount = pgCount
	h.meiliCount = mCount
	h.lastRecon = time.Now()

	if pgCount == mCount {
		h.reconStatus = "in_sync"
		log.Printf("Reconciliation Success: Index is in sync. Total dies: %d.", pgCount)
	} else {
		h.reconStatus = "out_of_sync"
		log.Printf("WARNING: Search Index Mismatch! PostgreSQL has %d records, but Meilisearch has %d documents.", pgCount, mCount)
	}
	h.reconMu.Unlock()
}

func (h *Handler) StartReconciliationScheduler() {
	go func() {
		// Wait 5 seconds to ensure DB and Meili are fully ready
		time.Sleep(5 * time.Second)
		h.RunReconciliation()

		// Tick every 24 hours
		ticker := time.NewTicker(24 * time.Hour)
		defer ticker.Stop()
		for range ticker.C {
			h.RunReconciliation()
		}
	}()
}
