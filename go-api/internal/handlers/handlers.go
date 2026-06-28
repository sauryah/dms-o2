package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/meilisearch/meilisearch-go"
	"dms-go-api/internal/auth"
	"dms-go-api/internal/config"
	"dms-go-api/internal/database"
	"dms-go-api/internal/events"
)

type Database interface {
	GetStats(ctx context.Context) (map[string]int, int, error)
	QueryPostgresDirectly(ctx context.Context, q, dieType, statusVal, location, casing, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax string, limit, offset int) ([]database.DieRepresentation, error)
	QueryPostgresDirectlyCount(ctx context.Context, q, dieType, statusVal, location, casing, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax string) (int, error)
	QueryPostgresByIDs(ctx context.Context, hitIDs []int64, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax string) ([]database.DieRepresentation, error)
	GetCount(ctx context.Context) (int, error)
	IsUserActive(ctx context.Context, userID int) (bool, error)
}

type Cache interface {
	Enabled() bool
	Get(ctx context.Context, key string) ([]byte, error)
	Set(ctx context.Context, key string, val []byte, expiration time.Duration) error
	Invalidate(ctx context.Context)
	Delete(ctx context.Context, key string) error
}

type Search interface {
	GetStats() (int64, error)
	Search(query string, searchRequest *meilisearch.SearchRequest) (*meilisearch.SearchResponse, error)
}

type ProblemDetails struct {
	Type     string `json:"type,omitempty"`
	Title    string `json:"title"`
	Status   int    `json:"status"`
	Detail   string `json:"detail"`
	Instance string `json:"instance"`
}

func writeProblemDetails(w http.ResponseWriter, r *http.Request, title string, status int, detail string) {
	w.Header().Set("Content-Type", "application/problem+json")
	w.WriteHeader(status)
	prob := ProblemDetails{
		Title:    title,
		Status:   status,
		Detail:   detail,
		Instance: r.URL.Path,
	}
	json.NewEncoder(w).Encode(prob)
}

type Handler struct {
	cfg          *config.Config
	db           Database
	cache        Cache
	search       Search
	eventManager *events.EventManager

	reconMu      sync.RWMutex
	lastRecon    time.Time
	reconStatus  string
	pgCount      int
	meiliCount   int
}

func NewHandler(
	cfg *config.Config,
	db Database,
	c Cache,
	s Search,
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

func (h *Handler) HandleIndexStatus(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if h.cache.Enabled() {
		statusJSON, err := h.cache.Get(r.Context(), "search_index_status")
		if err == nil {
			w.WriteHeader(http.StatusOK)
			w.Write(statusJSON)
			return
		}
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status":"ready"}`))
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
		slog.Error("Failed to query statistics", "error", err)
		writeProblemDetails(w, r, "Internal Server Error", http.StatusInternalServerError, err.Error())
		return
	}

	response := map[string]interface{}{
		"total": total,
		"stats": stats,
	}

	respBytes, err := json.Marshal(response)
	if err != nil {
		slog.Error("Failed to marshal stats response", "error", err)
		writeProblemDetails(w, r, "Internal Server Error", http.StatusInternalServerError, err.Error())
		return
	}

	// Cache in Redis for 15 seconds
	if h.cache.Enabled() {
		err = h.cache.Set(r.Context(), "stats", respBytes, 15*time.Second)
		if err != nil {
			slog.Warn("Failed to save stats to Redis", "error", err)
		}
	}

	w.WriteHeader(http.StatusOK)
	w.Write(respBytes)
}

type SearchResponse struct {
	Total   int                          `json:"total"`
	Limit   int                          `json:"limit"`
	Offset  int                          `json:"offset"`
	Results []database.DieRepresentation `json:"results"`
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

	offsetStr := r.URL.Query().Get("offset")
	offset := 0
	if offsetStr != "" {
		if parsedOffset, err := strconv.Atoi(offsetStr); err == nil && parsedOffset >= 0 {
			offset = parsedOffset
		} else {
			writeProblemDetails(w, r, "Bad Request", http.StatusBadRequest, "Invalid offset parameter format")
			return
		}
	}

	// Validate numeric query parameters
	if !validateFloatParam(sizeMin) || !validateFloatParam(sizeMax) ||
		!validateFloatParam(widthMin) || !validateFloatParam(widthMax) ||
		!validateFloatParam(thickMin) || !validateFloatParam(thickMax) {
		writeProblemDetails(w, r, "Bad Request", http.StatusBadRequest, "Invalid decimal parameter format")
		return
	}

	cacheKey := fmt.Sprintf("search:%s:%s:%s:%s:%s:%s:%s:%s:%s:%s:%s:%d:%d",
		q, dieType, statusVal, location, casing,
		sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax, limit, offset,
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
	var total int
	var err error

	if q == "" {
		// 1. Direct database query
		dies, err = h.db.QueryPostgresDirectly(r.Context(), "", dieType, statusVal, location, casing, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax, limit, offset)
		if err == nil {
			total, err = h.db.QueryPostgresDirectlyCount(r.Context(), "", dieType, statusVal, location, casing, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax)
		}
	} else {
		// 2. Query Meilisearch first, then database
		dies, total, err = h.QueryMeilisearchAndPostgres(r.Context(), q, dieType, statusVal, location, casing, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax, limit, offset)
	}

	if err != nil {
		slog.Error("Search query failed", "error", err)
		writeProblemDetails(w, r, "Internal Server Error", http.StatusInternalServerError, err.Error())
		return
	}

	if dies == nil {
		dies = []database.DieRepresentation{}
	}

	searchResponse := SearchResponse{
		Total:   total,
		Limit:   limit,
		Offset:  offset,
		Results: dies,
	}

	respBytes, err := json.Marshal(searchResponse)
	if err != nil {
		slog.Error("Failed to marshal search response", "error", err)
		writeProblemDetails(w, r, "Internal Server Error", http.StatusInternalServerError, err.Error())
		return
	}

	// Cache in Redis using configurable TTL
	if h.cache.Enabled() {
		err = h.cache.Set(r.Context(), cacheKey, respBytes, time.Duration(h.cfg.SearchCacheTTLSeconds)*time.Second)
		if err != nil {
			slog.Warn("Failed to save search results to Redis", "error", err)
		}
	}

	w.WriteHeader(http.StatusOK)
	w.Write(respBytes)
}

func scoreDie(die database.DieRepresentation, q string) int {
	// Clean query: trim quotes and whitespace
	qClean := strings.TrimSpace(strings.Trim(q, `"'`))
	if qClean == "" {
		return 0
	}
	qLower := strings.ToLower(qClean)
	dieIDLower := strings.ToLower(die.DieID)

	// 1. Exact size/dimension match
	qFloat, err := strconv.ParseFloat(qClean, 64)
	if err == nil {
		if die.DieType == "ROUND" && die.CurrentSize != nil {
			szFloat, err := strconv.ParseFloat(*die.CurrentSize, 64)
			if err == nil && szFloat == qFloat {
				return 100
			}
		} else if die.DieType == "FLAT" {
			if die.CurrentWidth != nil {
				wFloat, err := strconv.ParseFloat(*die.CurrentWidth, 64)
				if err == nil && wFloat == qFloat {
					return 100
				}
			}
			if die.CurrentThickness != nil {
				tFloat, err := strconv.ParseFloat(*die.CurrentThickness, 64)
				if err == nil && tFloat == qFloat {
					return 100
				}
			}
		}
	}

	// 2. Exact die_id match
	if dieIDLower == qLower {
		return 90
	}

	// 3. Starts-with matches
	if strings.HasPrefix(dieIDLower, qLower) {
		return 80
	}

	// 4. Partial matches (substring in die_id, dimensions, or other fields)
	if strings.Contains(dieIDLower, qLower) ||
		(die.CurrentSize != nil && strings.Contains(strings.ToLower(*die.CurrentSize), qLower)) ||
		(die.CurrentWidth != nil && strings.Contains(strings.ToLower(*die.CurrentWidth), qLower)) ||
		(die.CurrentThickness != nil && strings.Contains(strings.ToLower(*die.CurrentThickness), qLower)) ||
		strings.Contains(strings.ToLower(die.Casing), qLower) ||
		strings.Contains(strings.ToLower(die.Location), qLower) ||
		strings.Contains(strings.ToLower(die.SetName), qLower) ||
		strings.Contains(strings.ToLower(die.MachineName), qLower) ||
		strings.Contains(strings.ToLower(die.Status), qLower) {
		return 70
	}

	// 5. Fuzzy match / baseline
	return 50
}

func (h *Handler) QueryMeilisearchAndPostgres(ctx context.Context, q, dieType, statusVal, location, casing, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax string, limit, offset int) ([]database.DieRepresentation, int, error) {
	slog.Info("Received search query", "q", q)

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
		Limit:  int64(limit),
		Offset: int64(offset),
	}
	if len(filters) > 0 {
		searchParams.Filter = strings.Join(filters, " AND ")
	}

	slog.Info("Generated Meilisearch request", "filter", searchParams.Filter)

	var meiliDies []database.DieRepresentation
	totalHits := 0

	// Search Meilisearch index
	res, err := h.search.Search(q, &searchParams)
	if err != nil {
		slog.Error("Meilisearch search error", "error", err)
	} else {
		if res.TotalHits > 0 {
			totalHits = int(res.TotalHits)
		} else if res.EstimatedTotalHits > 0 {
			totalHits = int(res.EstimatedTotalHits)
		} else {
			totalHits = len(res.Hits)
		}

		slog.Info("Meilisearch search success", "hits", len(res.Hits), "totalHits", totalHits, "query", q)
		if len(res.Hits) > 0 {
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
			if len(hitIDs) > 0 {
				diesFromDB, err := h.db.QueryPostgresByIDs(ctx, hitIDs, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax)
				if err != nil {
					slog.Error("Failed to query Postgres by Meilisearch IDs", "error", err)
				} else {
					// Order them in original Meilisearch hit order
					dieMap := make(map[int64]database.DieRepresentation)
					for _, die := range diesFromDB {
						dieMap[die.ID] = die
					}
					for _, hid := range hitIDs {
						if die, ok := dieMap[hid]; ok {
							meiliDies = append(meiliDies, die)
						}
					}
				}
			}
		}
	}

	// Query Postgres directly to find any additional matches (e.g. numeric exact matches or wildcard matches)
	postgresDies, err := h.db.QueryPostgresDirectly(ctx, q, dieType, statusVal, location, casing, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax, limit, offset)
	if err != nil {
		slog.Error("Postgres direct query error", "error", err)
	}

	// Merge results (removing duplicates, preserving Meilisearch hit order first)
	seen := make(map[int64]bool)
	var combined []database.DieRepresentation

	for _, die := range meiliDies {
		if !seen[die.ID] {
			combined = append(combined, die)
			seen[die.ID] = true
		}
	}

	for _, die := range postgresDies {
		if !seen[die.ID] {
			combined = append(combined, die)
			seen[die.ID] = true
		}
	}

	slog.Info("Search results count before relevance sorting", "count", len(combined))

	// Detect if query contains digits to suppress irrelevant fuzzy token separations
	qClean := strings.TrimSpace(strings.Trim(q, `"'`))
	hasDigits := false
	for _, char := range qClean {
		if char >= '0' && char <= '9' {
			hasDigits = true
			break
		}
	}

	var filtered []database.DieRepresentation
	for _, die := range combined {
		score := scoreDie(die, q)
		// If query contains digits, filter out fuzzy matches (Score = 50) that do not match fields literally
		if hasDigits && score <= 50 {
			continue
		}
		filtered = append(filtered, die)
	}

	// Score and sort results based on the priority rules
	sort.SliceStable(filtered, func(i, j int) bool {
		scoreI := scoreDie(filtered[i], q)
		scoreJ := scoreDie(filtered[j], q)
		return scoreI > scoreJ // Higher score first
	})

	// Truncate to limit
	if len(filtered) > limit {
		filtered = filtered[:limit]
	}

	slog.Info("Search results count after sorting and limit truncation", "count", len(filtered))

	// Log scores of the first 5 results
	for i := 0; i < len(filtered) && i < 5; i++ {
		slog.Info("Search result score", "index", i, "die_id", filtered[i].DieID, "score", scoreDie(filtered[i], q))
	}

	if totalHits == 0 && len(combined) > 0 {
		totalHits = len(combined)
	}

	return filtered, totalHits, nil
}

func (h *Handler) HandleEvents(w http.ResponseWriter, r *http.Request) {
	var finalUserID int
	userID := r.Context().Value(auth.UserContextKey)
	if userID != nil {
		// Existing token-based auth
		// TODO: token parameter is deprecated, use ticket exchange instead
		var ok bool
		finalUserID, ok = userID.(int)
		if !ok {
			writeProblemDetails(w, r, "Unauthorized", http.StatusUnauthorized, "Invalid user ID format in session context")
			return
		}
	} else {
		// Try ticket-based auth
		ticket := r.URL.Query().Get("ticket")
		if ticket == "" {
			writeProblemDetails(w, r, "Unauthorized", http.StatusUnauthorized, "Authentication token or ticket is required")
			return
		}

		ticketKey := fmt.Sprintf("sse_ticket:%s", ticket)
		userIdBytes, err := h.cache.Get(r.Context(), ticketKey)
		if err != nil {
			writeProblemDetails(w, r, "Unauthorized", http.StatusUnauthorized, "Invalid or expired ticket")
			return
		}

		idVal, err := strconv.Atoi(string(userIdBytes))
		if err != nil {
			writeProblemDetails(w, r, "Unauthorized", http.StatusUnauthorized, "Invalid user ID in ticket data")
			return
		}

		isActive, err := h.db.IsUserActive(r.Context(), idVal)
		if err != nil || !isActive {
			writeProblemDetails(w, r, "Unauthorized", http.StatusUnauthorized, "User account is inactive or not found")
			return
		}

		_ = h.cache.Delete(r.Context(), ticketKey)
		finalUserID = idVal
	}

	slog.Info("SSE connection authenticated", "user_id", finalUserID)

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
		slog.Error("Streaming unsupported by web server")
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
	slog.Info("Starting Search Index Reconciliation")

	queryCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// 1. Get Postgres count
	pgCount, err := h.db.GetCount(queryCtx)
	if err != nil {
		slog.Error("Reconciliation error: Failed to count Postgres records", "error", err)
		h.reconMu.Lock()
		h.reconStatus = "error_postgres"
		h.lastRecon = time.Now()
		h.reconMu.Unlock()
		return
	}

	// 2. Get Meilisearch count
	mCountVal, err := h.search.GetStats()
	if err != nil {
		slog.Error("Reconciliation error: Failed to get Meilisearch stats", "error", err)
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
		slog.Info("Reconciliation Success: Index is in sync", "total_dies", pgCount)
	} else {
		h.reconStatus = "out_of_sync"
		slog.Warn("Search Index Mismatch", "postgres_count", pgCount, "meilisearch_count", mCount)
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

func validateFloatParam(s string) bool {
	if s == "" {
		return true
	}
	_, err := strconv.ParseFloat(s, 64)
	return err == nil
}

func escapeMeiliString(s string) string {
	return strings.ReplaceAll(s, "'", "\\'")
}
