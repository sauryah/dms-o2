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
	QueryPostgresDirectly(ctx context.Context, q, dieType, statusVal, location, casing, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax, machineID, setID, unassigned string, limit, offset int) ([]database.DieRepresentation, error)
	QueryPostgresDirectlyCount(ctx context.Context, q, dieType, statusVal, location, casing, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax, machineID, setID, unassigned string) (int, error)
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

type SearchParams struct {
	Q         string
	DieType   string
	Status    string
	Location  string
	Casing    string
	SizeMin   string
	SizeMax   string
	WidthMin  string
	WidthMax  string
	ThickMin  string
	ThickMax  string
	MachineID string
	SetID     string
	Unassigned string
	Limit     int
	Offset    int
}

func ParseSearchParams(r *http.Request) (*SearchParams, error) {
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
	machineID := r.URL.Query().Get("machine_id")
	setID := r.URL.Query().Get("set_id")
	unassigned := r.URL.Query().Get("unassigned")

	limit := 150
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	offset := 0
	if offsetStr := r.URL.Query().Get("offset"); offsetStr != "" {
		if parsedOffset, err := strconv.Atoi(offsetStr); err == nil && parsedOffset >= 0 {
			offset = parsedOffset
		} else {
			return nil, fmt.Errorf("invalid offset parameter format")
		}
	}

	if !validateFloatParam(sizeMin) || !validateFloatParam(sizeMax) ||
		!validateFloatParam(widthMin) || !validateFloatParam(widthMax) ||
		!validateFloatParam(thickMin) || !validateFloatParam(thickMax) {
		return nil, fmt.Errorf("invalid decimal parameter format")
	}

	return &SearchParams{
		Q: q, DieType: dieType, Status: statusVal,
		Location: location, Casing: casing,
		SizeMin: sizeMin, SizeMax: sizeMax,
		WidthMin: widthMin, WidthMax: widthMax,
		ThickMin: thickMin, ThickMax: thickMax,
		MachineID: machineID, SetID: setID, Unassigned: unassigned,
		Limit: limit, Offset: offset,
	}, nil
}

func (p *SearchParams) CacheKey() string {
	return fmt.Sprintf("search:%s:%s:%s:%s:%s:%s:%s:%s:%s:%s:%s:%s:%s:%s:%d:%d",
		p.Q, p.DieType, p.Status, p.Location, p.Casing,
		p.SizeMin, p.SizeMax, p.WidthMin, p.WidthMax, p.ThickMin, p.ThickMax,
		p.MachineID, p.SetID, p.Unassigned, p.Limit, p.Offset,
	)
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

func (h *Handler) HandleImportStatus(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	roleVal := r.Context().Value(auth.RoleContextKey)
	role, _ := roleVal.(string)
	if role != "ADMIN" && role != "ROOT" {
		writeProblemDetails(w, r, "Forbidden", http.StatusForbidden, "Only ADMIN or ROOT users are authorized to view import status")
		return
	}

	if h.cache.Enabled() {
		statusJSON, err := h.cache.Get(r.Context(), "import_status")
		if err == nil {
			var statusData struct {
				Status string `json:"status"`
			}
			if errUnmarshal := json.Unmarshal(statusJSON, &statusData); errUnmarshal == nil {
				if statusData.Status == "ready" || statusData.Status == "error" {
					_ = h.cache.Delete(r.Context(), "import_status")
				}
			}
			w.WriteHeader(http.StatusOK)
			w.Write(statusJSON)
			return
		}
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status":"idle"}`))
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

	params, err := ParseSearchParams(r)
	if err != nil {
		writeProblemDetails(w, r, "Bad Request", http.StatusBadRequest, err.Error())
		return
	}

	cacheKey := params.CacheKey()

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

	if params.Q == "" {
		dies, err = h.db.QueryPostgresDirectly(r.Context(), params.Q, params.DieType, params.Status, params.Location, params.Casing, params.SizeMin, params.SizeMax, params.WidthMin, params.WidthMax, params.ThickMin, params.ThickMax, params.MachineID, params.SetID, params.Unassigned, params.Limit, params.Offset)
		if err == nil {
			total, err = h.db.QueryPostgresDirectlyCount(r.Context(), params.Q, params.DieType, params.Status, params.Location, params.Casing, params.SizeMin, params.SizeMax, params.WidthMin, params.WidthMax, params.ThickMin, params.ThickMax, params.MachineID, params.SetID, params.Unassigned)
		}
	} else {
		dies, total, err = h.QueryMeilisearchAndPostgres(r.Context(), params)
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
		Limit:   params.Limit,
		Offset:  params.Offset,
		Results: dies,
	}

	respBytes, err := json.Marshal(searchResponse)
	if err != nil {
		slog.Error("Failed to marshal search response", "error", err)
		writeProblemDetails(w, r, "Internal Server Error", http.StatusInternalServerError, err.Error())
		return
	}

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

func (h *Handler) QueryMeilisearchAndPostgres(ctx context.Context, params *SearchParams) ([]database.DieRepresentation, int, error) {
	slog.Info("Received search query", "q", params.Q)

	var filters []string
	if params.DieType != "" {
		filters = append(filters, fmt.Sprintf("die_type = '%s'", escapeMeiliFilterValue(params.DieType)))
	}
	if params.Status != "" {
		filters = append(filters, fmt.Sprintf("status = '%s'", escapeMeiliFilterValue(params.Status)))
	}
	if params.Location != "" {
		filters = append(filters, fmt.Sprintf("location = '%s'", escapeMeiliFilterValue(params.Location)))
	}
	if params.Casing != "" {
		filters = append(filters, fmt.Sprintf("casing = '%s'", escapeMeiliFilterValue(params.Casing)))
	}

	if params.SizeMin != "" {
		filters = append(filters, fmt.Sprintf("size >= %s", params.SizeMin))
	}
	if params.SizeMax != "" {
		filters = append(filters, fmt.Sprintf("size <= %s", params.SizeMax))
	}
	if params.WidthMin != "" {
		filters = append(filters, fmt.Sprintf("width >= %s", params.WidthMin))
	}
	if params.WidthMax != "" {
		filters = append(filters, fmt.Sprintf("width <= %s", params.WidthMax))
	}
	if params.ThickMin != "" {
		filters = append(filters, fmt.Sprintf("thickness >= %s", params.ThickMin))
	}
	if params.ThickMax != "" {
		filters = append(filters, fmt.Sprintf("thickness <= %s", params.ThickMax))
	}

	searchParams := meilisearch.SearchRequest{
		Limit:  int64(params.Limit),
		Offset: int64(params.Offset),
	}
	if len(filters) > 0 {
		searchParams.Filter = strings.Join(filters, " AND ")
	}

	slog.Info("Generated Meilisearch request", "filter", searchParams.Filter)

	var meiliDies []database.DieRepresentation
	totalHits := 0
	meiliSuccess := false

	// Search Meilisearch index
		res, err := h.search.Search(params.Q, &searchParams)
	if err != nil {
		slog.Error("Meilisearch search error", "error", err)
	} else {
		meiliSuccess = true
		if res.TotalHits > 0 {
			totalHits = int(res.TotalHits)
		} else if res.EstimatedTotalHits > 0 {
			totalHits = int(res.EstimatedTotalHits)
		} else {
			totalHits = len(res.Hits)
		}

		slog.Info("Meilisearch search success", "hits", len(res.Hits), "totalHits", totalHits, "query", params.Q)
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
				diesFromDB, err := h.db.QueryPostgresByIDs(ctx, hitIDs, params.SizeMin, params.SizeMax, params.WidthMin, params.WidthMax, params.ThickMin, params.ThickMax)
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

	var combined []database.DieRepresentation

	if meiliSuccess {
		combined = meiliDies
	} else {
		// Fallback to Postgres direct query only if Meilisearch search failed
		postgresDies, err := h.db.QueryPostgresDirectly(ctx, params.Q, params.DieType, params.Status, params.Location, params.Casing, params.SizeMin, params.SizeMax, params.WidthMin, params.WidthMax, params.ThickMin, params.ThickMax, params.MachineID, params.SetID, params.Unassigned, params.Limit, params.Offset)
		if err != nil {
			slog.Error("Postgres direct query fallback error", "error", err)
		} else {
			combined = postgresDies
			if totalHits == 0 && len(combined) > 0 {
				totalHits = len(combined)
			}
		}
	}

	slog.Info("Search results count before relevance sorting", "count", len(combined))

	qClean := strings.TrimSpace(strings.Trim(params.Q, `"'`))
	hasDigits := false
	for _, char := range qClean {
		if char >= '0' && char <= '9' {
			hasDigits = true
			break
		}
	}

	var filtered []database.DieRepresentation
	var scores []int
	for _, die := range combined {
		score := scoreDie(die, params.Q)
		if hasDigits && score <= 50 {
			continue
		}
		filtered = append(filtered, die)
		scores = append(scores, score)
	}

	type scoredDie struct {
		die   database.DieRepresentation
		score int
	}

	scored := make([]scoredDie, len(filtered))
	for i, die := range filtered {
		scored[i] = scoredDie{die: die, score: scores[i]}
	}

	sort.SliceStable(scored, func(i, j int) bool {
		return scored[i].score > scored[j].score
	})

	for i := range scored {
		filtered[i] = scored[i].die
	}

	if len(filtered) > params.Limit {
		filtered = filtered[:params.Limit]
	}

	slog.Info("Search results count after sorting and limit truncation", "count", len(filtered))

	for i := 0; i < len(filtered) && i < 5; i++ {
		slog.Info("Search result score", "index", i, "die_id", filtered[i].DieID, "score", scores[i])
	}

	if totalHits == 0 && len(combined) > 0 {
		totalHits = len(combined)
	}

	return filtered, totalHits, nil
}

func (h *Handler) HandleEvents(w http.ResponseWriter, r *http.Request) {
	ticket := r.URL.Query().Get("ticket")
	if ticket == "" {
		writeProblemDetails(w, r, "Unauthorized", http.StatusUnauthorized, "Authentication ticket is required")
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
	finalUserID := idVal

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

	// Check if we need to backfill missed events for a reconnecting client
	lastEventIDStr := r.Header.Get("Last-Event-ID")
	if lastEventIDStr == "" {
		lastEventIDStr = r.URL.Query().Get("last_event_id")
	}
	if lastEventIDStr != "" {
		if lastID, err := strconv.ParseInt(lastEventIDStr, 10, 64); err == nil {
			h.eventManager.Backfill(w, flusher, lastID)
		}
	}

	// Keep alive ticker
	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case ev, ok := <-clientChan:
			if !ok {
				return
			}
			fmt.Fprintf(w, "id: %d\ndata: %s\n\n", ev.ID, ev.Message)
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

func escapeMeiliFilterValue(s string) string {
	s = strings.ReplaceAll(s, "\\", "\\\\")
	s = strings.ReplaceAll(s, "'", "\\'")
	s = strings.ReplaceAll(s, "\n", "")
	s = strings.ReplaceAll(s, "\r", "")
	return s
}
