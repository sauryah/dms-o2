package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"math"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"dms-go-api/internal/auth"
	"dms-go-api/internal/config"
	"dms-go-api/internal/database"
	"dms-go-api/internal/events"
	"github.com/meilisearch/meilisearch-go"
)

type Database interface {
	GetStats(ctx context.Context) (map[string]int, int, error)
	QueryPostgresDirectly(ctx context.Context, q, dieType, statusVal, casing, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax, machineID, setID, unassigned string, limit, offset int) ([]database.DieRepresentation, error)
	QueryPostgresDirectlyCount(ctx context.Context, q, dieType, statusVal, casing, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax, machineID, setID, unassigned string) (int, error)
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
	Ping(ctx context.Context) error
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

func requirePost(w http.ResponseWriter, r *http.Request) bool {
	if r.Method != http.MethodPost {
		writeProblemDetails(w, r, "Method Not Allowed", http.StatusMethodNotAllowed, "Only POST method is allowed")
		return false
	}
	return true
}

type SearchParams struct {
	Q          string
	DieType    string
	Status     string
	Casing     string
	SizeMin    string
	SizeMax    string
	WidthMin   string
	WidthMax   string
	ThickMin   string
	ThickMax   string
	MachineID  string
	SetID      string
	Unassigned string
	Limit      int
	Offset     int
}

func ParseSearchParams(r *http.Request) (*SearchParams, error) {
	q := r.URL.Query().Get("q")
	dieType := r.URL.Query().Get("die_type")
	statusVal := r.URL.Query().Get("status")
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
		Casing:  casing,
		SizeMin: sizeMin, SizeMax: sizeMax,
		WidthMin: widthMin, WidthMax: widthMax,
		ThickMin: thickMin, ThickMax: thickMax,
		MachineID: machineID, SetID: setID, Unassigned: unassigned,
		Limit: limit, Offset: offset,
	}, nil
}

func (p *SearchParams) CacheKey() string {
	return fmt.Sprintf("search:%s:%s:%s:%s:%s:%s:%s:%s:%s:%s:%s:%s:%s:%d:%d",
		p.Q, p.DieType, p.Status, p.Casing,
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

	reconMu     sync.RWMutex
	lastRecon   time.Time
	reconStatus string
	pgCount     int
	meiliCount  int
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

	h.reconMu.RLock()
	lastRun := h.lastRecon
	status := h.reconStatus
	pgCnt := h.pgCount
	mCnt := h.meiliCount
	h.reconMu.RUnlock()

	// Check PostgreSQL connectivity
	dbStatus := "up"
	if _, err := h.db.GetCount(r.Context()); err != nil {
		dbStatus = "down"
	}

	// Check Meilisearch connectivity
	meiliStatus := "up"
	if _, err := h.search.GetStats(); err != nil {
		meiliStatus = "down"
	}

	// Check Redis connectivity
	redisStatus := "up"
	if err := h.cache.Ping(r.Context()); err != nil {
		redisStatus = "down"
	}

	httpStatus := http.StatusOK
	if dbStatus != "up" || meiliStatus != "up" || redisStatus != "up" {
		httpStatus = http.StatusServiceUnavailable
	}
	w.WriteHeader(httpStatus)

	resp := map[string]interface{}{
		"status": map[string]string{
			"postgres":    dbStatus,
			"meilisearch": meiliStatus,
			"redis":       redisStatus,
		},
		"reconciliation": map[string]interface{}{
			"last_run":       lastRun.Format(time.RFC3339),
			"status":         status,
			"postgres_count": pgCnt,
			"meili_count":    mCnt,
		},
	}
	json.NewEncoder(w).Encode(resp)
}

func (h *Handler) HandleLiveness(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "live"})
}

func (h *Handler) HandleReadiness(w http.ResponseWriter, r *http.Request) {
	h.HandleHealth(w, r)
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
			// Check if stats are fresh
			_, errFresh := h.cache.Get(r.Context(), "stats:fresh")
			if errFresh != nil {
				// Cache is stale! Set stats:fresh immediately as a short-lived lock (5s) to prevent concurrent refreshes
				_ = h.cache.Set(r.Context(), "stats:fresh", []byte("locked"), 5*time.Second)

				// Trigger background refresh
				go func() {
					bgCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
					defer cancel()

					stats, total, err := h.db.GetStats(bgCtx)
					if err != nil {
						slog.Error("Background stats refresh failed", "error", err)
						_ = h.cache.Delete(bgCtx, "stats:fresh")
						return
					}

					response := map[string]interface{}{
						"total": total,
						"stats": stats,
					}

					respBytes, err := json.Marshal(response)
					if err != nil {
						slog.Error("Background stats marshal failed", "error", err)
						_ = h.cache.Delete(bgCtx, "stats:fresh")
						return
					}

					// Update stats (24h) and stats:fresh (15s)
					_ = h.cache.Set(bgCtx, "stats", respBytes, 24*time.Hour)
					_ = h.cache.Set(bgCtx, "stats:fresh", []byte("true"), 15*time.Second)
					slog.Info("Successfully refreshed stats cache asynchronously")
				}()
			}

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

	// Cache in Redis for 24 hours (stats) and 15 seconds (stats:fresh)
	if h.cache.Enabled() {
		_ = h.cache.Set(r.Context(), "stats", respBytes, 24*time.Hour)
		_ = h.cache.Set(r.Context(), "stats:fresh", []byte("true"), 15*time.Second)
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
		dies, err = h.db.QueryPostgresDirectly(r.Context(), params.Q, params.DieType, params.Status, params.Casing, params.SizeMin, params.SizeMax, params.WidthMin, params.WidthMax, params.ThickMin, params.ThickMax, params.MachineID, params.SetID, params.Unassigned, params.Limit, params.Offset)
		if err == nil {
			total, err = h.db.QueryPostgresDirectlyCount(r.Context(), params.Q, params.DieType, params.Status, params.Casing, params.SizeMin, params.SizeMax, params.WidthMin, params.WidthMax, params.ThickMin, params.ThickMax, params.MachineID, params.SetID, params.Unassigned)
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

	// Clean unit suffix for numeric evaluation (e.g., "2.5mm" -> "2.5")
	qNumStr := qClean
	if strings.HasSuffix(strings.ToLower(qNumStr), "mm") {
		qNumStr = strings.TrimSpace(qNumStr[:len(qNumStr)-2])
	}

	// 1. Exact size/dimension match
	qFloat, err := strconv.ParseFloat(qNumStr, 64)
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

	// Helper for dimension prefix / exact matching
	matchDimension := func(dimStr *string) bool {
		if dimStr == nil {
			return false
		}
		dStr := strings.TrimSpace(*dimStr)
		if dStr == "" {
			return false
		}
		// Match exact dimension string or starts-with prefix (e.g., query "25" matches size "25.4")
		if dStr == qNumStr || dStr == qLower || strings.HasPrefix(dStr, qNumStr) || strings.HasPrefix(dStr, qLower) {
			return true
		}
		return false
	}

	// 4. Partial matches (substring in die_id, casing, location, etc., or dimension prefix match)
	if strings.Contains(dieIDLower, qLower) ||
		(die.DieType == "ROUND" && matchDimension(die.CurrentSize)) ||
		(die.DieType == "FLAT" && (matchDimension(die.CurrentWidth) || matchDimension(die.CurrentThickness))) ||
		strings.Contains(strings.ToLower(die.Casing), qLower) ||
		strings.Contains(strings.ToLower(die.Location), qLower) ||
		strings.Contains(strings.ToLower(die.RackName), qLower) ||
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

	// Detect numeric queries (e.g. "1.6", "1.600", "25.4mm")
	qClean := strings.TrimSpace(strings.Trim(params.Q, `"'`))
	qNumStr := qClean
	if strings.HasSuffix(strings.ToLower(qNumStr), "mm") {
		qNumStr = strings.TrimSpace(qNumStr[:len(qNumStr)-2])
	}
	isNumericQuery := false
	if _, err := strconv.ParseFloat(qNumStr, 64); err == nil {
		isNumericQuery = true
	}

	// For numeric queries, use Postgres directly — it does correct ILIKE prefix
	// matching on CAST(r.current_size AS TEXT), which Meilisearch float tokenization
	// handles poorly (e.g. "1.6" misses "1.600" because Meilisearch normalizes floats).
	if isNumericQuery {
		slog.Info("Numeric query detected, using Postgres direct query", "query", params.Q, "numStr", qNumStr)
		postgresDies, err := h.db.QueryPostgresDirectly(ctx, params.Q, params.DieType, params.Status, params.Casing, params.SizeMin, params.SizeMax, params.WidthMin, params.WidthMax, params.ThickMin, params.ThickMax, params.MachineID, params.SetID, params.Unassigned, params.Limit, params.Offset)
		if err != nil {
			slog.Error("Postgres direct query for numeric search failed", "error", err)
			return nil, 0, err
		}
		// Still run scoreDie filtering/sorting on Postgres results
		var filtered []database.DieRepresentation
		var scores []int
		for _, die := range postgresDies {
			score := scoreDie(die, params.Q)
			if score <= 50 {
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
		totalCount := len(filtered)
		if params.Offset > 0 {
			totalCount = params.Offset + len(filtered)
		}
		if len(filtered) > params.Limit {
			filtered = filtered[:params.Limit]
		}
		return filtered, totalCount, nil
	}

	var filters []string
	if params.DieType != "" {
		filters = append(filters, fmt.Sprintf("die_type = '%s'", escapeMeiliFilterValue(params.DieType)))
	}
	if params.Status != "" {
		filters = append(filters, fmt.Sprintf("status = '%s'", escapeMeiliFilterValue(params.Status)))
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
		postgresDies, err := h.db.QueryPostgresDirectly(ctx, params.Q, params.DieType, params.Status, params.Casing, params.SizeMin, params.SizeMax, params.WidthMin, params.WidthMax, params.ThickMin, params.ThickMax, params.MachineID, params.SetID, params.Unassigned, params.Limit, params.Offset)
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

	totalCount := len(filtered)
	if hasDigits {
		if params.Offset > 0 {
			totalCount = params.Offset + len(filtered)
		} else {
			totalCount = len(filtered)
		}
	} else if meiliSuccess && totalHits > totalCount {
		totalCount = totalHits
	}

	if len(filtered) > params.Limit {
		filtered = filtered[:params.Limit]
	}

	slog.Info("Search results count after sorting and limit truncation", "count", len(filtered), "total", totalCount)

	for i := 0; i < len(filtered) && i < 5; i++ {
		slog.Info("Search result score", "index", i, "die_id", filtered[i].DieID, "score", scores[i])
	}

	return filtered, totalCount, nil
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

// Calculator requests and responses

type RoundCalcRequest struct {
	CalcMode      string  `json:"calc_mode"`
	Inlet         float64 `json:"inlet"`
	Outlet        float64 `json:"outlet"`
	TargetRed     float64 `json:"target_red"`
	TargetElong   float64 `json:"target_elong"`
	MaterialType  string  `json:"material_type"`
	CustomLimit   float64 `json:"custom_limit"`
	DrawSpeed     float64 `json:"draw_speed"`
	DieAngle      float64 `json:"die_angle"`
	YieldStrength float64 `json:"yield_strength"`
	UTS           float64 `json:"uts"`
	Lubrication   string  `json:"lubrication"`
}

type RoundCalcResponse struct {
	Inlet           float64 `json:"inlet"`
	Outlet          float64 `json:"outlet"`
	Reduction       float64 `json:"reduction"`
	Elongation      float64 `json:"elongation"`
	ElongationRatio float64 `json:"elongation_ratio"`
	InArea          float64 `json:"in_area"`
	OutArea         float64 `json:"out_area"`
	DiameterRatio   float64 `json:"diameter_ratio"`
	FlowStress      float64 `json:"flow_stress"`
	DrawingStress   float64 `json:"drawing_stress"`
	DrawingForce    float64 `json:"drawing_force"`
	PowerKw         float64 `json:"power_kw"`
	FrictionCoef    float64 `json:"friction_coef"`
	MaterialLimit   float64 `json:"material_limit"`
}

type FlatCalcRequest struct {
	InWidth       float64 `json:"in_width"`
	InThick       float64 `json:"in_thick"`
	OutWidth      float64 `json:"out_width"`
	OutThick      float64 `json:"out_thick"`
	MaterialType  string  `json:"material_type"`
	CustomLimit   float64 `json:"custom_limit"`
	DrawSpeed     float64 `json:"draw_speed"`
	DieAngle      float64 `json:"die_angle"`
	YieldStrength float64 `json:"yield_strength"`
	UTS           float64 `json:"uts"`
	Lubrication   string  `json:"lubrication"`
}

type FlatCalcResponse struct {
	InArea        float64 `json:"in_area"`
	OutArea       float64 `json:"out_area"`
	Reduction     float64 `json:"reduction"`
	Elongation    float64 `json:"elongation"`
	AspectIn      float64 `json:"aspect_in"`
	AspectOut     float64 `json:"aspect_out"`
	WidthRed      float64 `json:"width_red"`
	ThickRed      float64 `json:"thick_red"`
	FlowStress    float64 `json:"flow_stress"`
	DrawingStress float64 `json:"drawing_stress"`
	DrawingForce  float64 `json:"drawing_force"`
	PowerKw       float64 `json:"power_kw"`
	FrictionCoef  float64 `json:"friction_coef"`
	MaterialLimit float64 `json:"material_limit"`
}

type SequenceCalcRequest struct {
	Start         float64 `json:"start"`
	End           float64 `json:"end"`
	Reduction     float64 `json:"reduction"`
	OptMode       string  `json:"opt_mode"`
	MaterialType  string  `json:"material_type"`
	CustomLimit   float64 `json:"custom_limit"`
	DrawSpeed     float64 `json:"draw_speed"`
	DieAngle      float64 `json:"die_angle"`
	YieldStrength float64 `json:"yield_strength"`
	UTS           float64 `json:"uts"`
	Lubrication   string  `json:"lubrication"`
}

type SequenceStep struct {
	Draft         int     `json:"draft"`
	Inlet         float64 `json:"inlet"`
	Outlet        float64 `json:"outlet"`
	Reduction     float64 `json:"reduction"`
	Elongation    float64 `json:"elongation"`
	DrawingRatio  float64 `json:"drawing_ratio"`
	FlowStress    float64 `json:"flow_stress"`
	DrawingStress float64 `json:"drawing_stress"`
	DrawingForce  float64 `json:"drawing_force"`
	Power         float64 `json:"power"`
}

type SequenceCalcResponse struct {
	Steps           []SequenceStep `json:"steps"`
	TotalReduction  float64        `json:"total_reduction"`
	TotalElongation float64        `json:"total_elongation"`
}

// Calculation logic helpers

func getFrictionCoefficient(lubrication string) float64 {
	switch lubrication {
	case "hydrodynamic":
		return 0.02
	case "dry_soap":
		return 0.04
	case "wet_oil":
		return 0.06
	case "boundary":
		return 0.10
	default:
		return 0.04
	}
}

func getFlowStress(inArea, outArea float64, yieldStrength float64, materialType string) float64 {
	if inArea <= 0 || outArea <= 0 {
		return yieldStrength
	}
	epsilon := math.Log(inArea / outArea)
	if epsilon <= 0 {
		return yieldStrength
	}

	var K, n float64
	y0 := yieldStrength

	switch materialType {
	case "copper_soft":
		K = 315
		n = 0.54
	case "copper_hard":
		K = 450
		n = 0.10
	case "aluminum":
		K = 180
		n = 0.20
	case "steel_low":
		K = 530
		n = 0.26
	case "custom":
		fallthrough
	default:
		return y0 + 150*epsilon
	}
	return y0 + (K*math.Pow(epsilon, n))/(n+1)
}

func getDrawingStress(inArea, outArea, alphaRad float64, yieldStrength float64, materialType string, mu float64) float64 {
	if inArea <= outArea || alphaRad <= 0 || inArea <= 0 || outArea <= 0 {
		return 0
	}
	epsilon := math.Log(inArea / outArea)
	r := (inArea - outArea) / inArea
	if r <= 0 {
		return 0
	}
	delta := (alphaRad / r) * (2 - r)
	phi := 0.88 + 0.12*delta
	flowStress := getFlowStress(inArea, outArea, yieldStrength, materialType)
	return flowStress * (1 + mu/math.Tan(alphaRad)) * epsilon * phi
}

func getMaterialLimit(materialType string, customLimit float64) float64 {
	switch materialType {
	case "copper_soft":
		return 30.0
	case "copper_hard":
		return 20.0
	case "aluminum":
		return 25.0
	case "steel_low":
		return 22.0
	case "custom":
		return customLimit
	default:
		return 30.0
	}
}

// Handlers

func (h *Handler) HandleCalculateRound(w http.ResponseWriter, r *http.Request) {
	if !requirePost(w, r) {
		return
	}

	var req RoundCalcRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeProblemDetails(w, r, "Bad Request", http.StatusBadRequest, "Invalid request JSON payload")
		return
	}

	if req.Inlet <= 0 {
		writeProblemDetails(w, r, "Unprocessable Entity", http.StatusUnprocessableEntity, "Inlet diameter must be a positive number greater than 0 mm.")
		return
	}

	inArea := math.Pi * math.Pow(req.Inlet/2, 2)
	var outlet, reduction, elongation, elongationRatio, outArea, diameterRatio float64

	switch req.CalcMode {
	case "forward":
		if req.Outlet <= 0 {
			writeProblemDetails(w, r, "Unprocessable Entity", http.StatusUnprocessableEntity, "Outlet diameter must be a positive number greater than 0 mm.")
			return
		}
		if req.Outlet >= req.Inlet {
			writeProblemDetails(w, r, "Unprocessable Entity", http.StatusUnprocessableEntity, fmt.Sprintf("Outlet diameter (%.2f mm) must be strictly smaller than inlet diameter (%.2f mm).", req.Outlet, req.Inlet))
			return
		}
		outlet = req.Outlet
		outArea = math.Pi * math.Pow(outlet/2, 2)
		reduction = ((inArea - outArea) / inArea) * 100
		elongation = ((inArea / outArea) - 1) * 100
		elongationRatio = inArea / outArea
		diameterRatio = req.Inlet / outlet

	case "backward_red":
		if req.TargetRed <= 0 || req.TargetRed >= 100 {
			writeProblemDetails(w, r, "Unprocessable Entity", http.StatusUnprocessableEntity, "Target area reduction % must be between 0% and 100%.")
			return
		}
		reduction = req.TargetRed
		outArea = inArea * (1 - reduction/100)
		outlet = 2 * math.Sqrt(outArea/math.Pi)
		elongation = ((inArea / outArea) - 1) * 100
		elongationRatio = inArea / outArea
		diameterRatio = req.Inlet / outlet

	case "backward_elong":
		if req.TargetElong <= 0 {
			writeProblemDetails(w, r, "Unprocessable Entity", http.StatusUnprocessableEntity, "Target elongation % must be a positive number greater than 0%.")
			return
		}
		elongation = req.TargetElong
		outArea = inArea / (1 + elongation/100)
		outlet = 2 * math.Sqrt(outArea/math.Pi)
		reduction = ((inArea - outArea) / inArea) * 100
		elongationRatio = 1 + elongation/100
		diameterRatio = req.Inlet / outlet

	default:
		writeProblemDetails(w, r, "Unprocessable Entity", http.StatusUnprocessableEntity, "Invalid calculation mode.")
		return
	}

	alphaRad := (req.DieAngle * math.Pi) / 180
	mu := getFrictionCoefficient(req.Lubrication)
	flowStress := getFlowStress(inArea, outArea, req.YieldStrength, req.MaterialType)
	drawingStress := getDrawingStress(inArea, outArea, alphaRad, req.YieldStrength, req.MaterialType, mu)
	drawingForce := outArea * drawingStress
	powerKw := (drawingForce * req.DrawSpeed) / 1000
	matLimit := getMaterialLimit(req.MaterialType, req.CustomLimit)

	resp := RoundCalcResponse{
		Inlet:           req.Inlet,
		Outlet:          outlet,
		Reduction:       reduction,
		Elongation:      elongation,
		ElongationRatio: elongationRatio,
		InArea:          inArea,
		OutArea:         outArea,
		DiameterRatio:   diameterRatio,
		FlowStress:      flowStress,
		DrawingStress:   drawingStress,
		DrawingForce:    drawingForce,
		PowerKw:         powerKw,
		FrictionCoef:    mu,
		MaterialLimit:   matLimit,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(resp)
}

func (h *Handler) HandleCalculateFlat(w http.ResponseWriter, r *http.Request) {
	if !requirePost(w, r) {
		return
	}

	var req FlatCalcRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeProblemDetails(w, r, "Bad Request", http.StatusBadRequest, "Invalid request JSON payload")
		return
	}

	if req.InWidth <= 0 || req.InThick <= 0 {
		writeProblemDetails(w, r, "Unprocessable Entity", http.StatusUnprocessableEntity, "Inlet width and thickness must be positive numbers greater than 0 mm.")
		return
	}
	if req.OutWidth <= 0 || req.OutThick <= 0 {
		writeProblemDetails(w, r, "Unprocessable Entity", http.StatusUnprocessableEntity, "Outlet width and thickness must be positive numbers greater than 0 mm.")
		return
	}

	inArea := req.InWidth * req.InThick
	outArea := req.OutWidth * req.OutThick

	if outArea >= inArea {
		writeProblemDetails(w, r, "Unprocessable Entity", http.StatusUnprocessableEntity, fmt.Sprintf("Finished outlet cross-section area (%.2f mm²) must be smaller than inlet area (%.2f mm²).", outArea, inArea))
		return
	}

	reduction := ((inArea - outArea) / inArea) * 100
	elongation := ((inArea / outArea) - 1) * 100
	aspectIn := req.InWidth / req.InThick
	aspectOut := req.OutWidth / req.OutThick
	widthRed := ((req.InWidth - req.OutWidth) / req.InWidth) * 100
	thickRed := ((req.InThick - req.OutThick) / req.InThick) * 100

	alphaRad := (req.DieAngle * math.Pi) / 180
	mu := getFrictionCoefficient(req.Lubrication)
	flowStress := getFlowStress(inArea, outArea, req.YieldStrength, req.MaterialType)
	drawingStress := getDrawingStress(inArea, outArea, alphaRad, req.YieldStrength, req.MaterialType, mu)
	drawingForce := outArea * drawingStress
	powerKw := (drawingForce * req.DrawSpeed) / 1000
	matLimit := getMaterialLimit(req.MaterialType, req.CustomLimit)

	resp := FlatCalcResponse{
		InArea:        inArea,
		OutArea:       outArea,
		Reduction:     reduction,
		Elongation:    elongation,
		AspectIn:      aspectIn,
		AspectOut:     aspectOut,
		WidthRed:      widthRed,
		ThickRed:      thickRed,
		FlowStress:    flowStress,
		DrawingStress: drawingStress,
		DrawingForce:  drawingForce,
		PowerKw:       powerKw,
		FrictionCoef:  mu,
		MaterialLimit: matLimit,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(resp)
}

func (h *Handler) HandleCalculateSequence(w http.ResponseWriter, r *http.Request) {
	if !requirePost(w, r) {
		return
	}

	var req SequenceCalcRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeProblemDetails(w, r, "Bad Request", http.StatusBadRequest, "Invalid request JSON payload")
		return
	}

	if req.Start <= 0 {
		writeProblemDetails(w, r, "Unprocessable Entity", http.StatusUnprocessableEntity, "Start diameter must be a positive number greater than 0 mm.")
		return
	}
	if req.End <= 0 {
		writeProblemDetails(w, r, "Unprocessable Entity", http.StatusUnprocessableEntity, "End diameter must be a positive number greater than 0 mm.")
		return
	}
	if req.Start <= req.End {
		writeProblemDetails(w, r, "Unprocessable Entity", http.StatusUnprocessableEntity, fmt.Sprintf("Start diameter (%.2f mm) must be strictly greater than target end diameter (%.2f mm).", req.Start, req.End))
		return
	}
	if req.Reduction <= 0 || req.Reduction >= 100 {
		writeProblemDetails(w, r, "Unprocessable Entity", http.StatusUnprocessableEntity, "Average reduction % per pass must be between 0% and 100%.")
		return
	}

	steps := []SequenceStep{}
	currentDia := req.Start
	safetyCounter := 0
	currentRed := req.Reduction
	if req.OptMode == "graduated" {
		currentRed = math.Min(req.Reduction*1.25, 30.0)
	}

	mu := getFrictionCoefficient(req.Lubrication)
	alphaRad := (req.DieAngle * math.Pi) / 180

	for currentDia > req.End && safetyCounter < 50 {
		safetyCounter++
		targetRedMultiplier := 1 - currentRed/100
		nextArea := (math.Pi * math.Pow(currentDia/2, 2)) * targetRedMultiplier
		nextDia := 2 * math.Sqrt(nextArea/math.Pi)

		var stepInArea, stepOutArea, actualRed, actualElong, drawingRatio float64

		if nextDia <= req.End {
			stepInArea = math.Pi * math.Pow(currentDia/2, 2)
			stepOutArea = math.Pi * math.Pow(req.End/2, 2)
			actualRed = ((stepInArea - stepOutArea) / stepInArea) * 100
			actualElong = ((stepInArea / stepOutArea) - 1) * 100
			drawingRatio = stepInArea / stepOutArea

			flowStress := getFlowStress(stepInArea, stepOutArea, req.YieldStrength, req.MaterialType)
			drawingStress := getDrawingStress(stepInArea, stepOutArea, alphaRad, req.YieldStrength, req.MaterialType, mu)
			drawingForce := stepOutArea * drawingStress
			power := (drawingForce * req.DrawSpeed) / 1000

			steps = append(steps, SequenceStep{
				Draft:         len(steps) + 1,
				Inlet:         currentDia,
				Outlet:        req.End,
				Reduction:     actualRed,
				Elongation:    actualElong,
				DrawingRatio:  drawingRatio,
				FlowStress:    flowStress,
				DrawingStress: drawingStress,
				DrawingForce:  drawingForce,
				Power:         power,
			})
			break
		} else {
			stepInArea = math.Pi * math.Pow(currentDia/2, 2)
			stepOutArea = nextArea
			actualRed = currentRed
			actualElong = (1/targetRedMultiplier - 1) * 100
			drawingRatio = 1 / targetRedMultiplier

			flowStress := getFlowStress(stepInArea, stepOutArea, req.YieldStrength, req.MaterialType)
			drawingStress := getDrawingStress(stepInArea, stepOutArea, alphaRad, req.YieldStrength, req.MaterialType, mu)
			drawingForce := stepOutArea * drawingStress
			power := (drawingForce * req.DrawSpeed) / 1000

			steps = append(steps, SequenceStep{
				Draft:         len(steps) + 1,
				Inlet:         currentDia,
				Outlet:        nextDia,
				Reduction:     actualRed,
				Elongation:    actualElong,
				DrawingRatio:  drawingRatio,
				FlowStress:    flowStress,
				DrawingStress: drawingStress,
				DrawingForce:  drawingForce,
				Power:         power,
			})
			currentDia = nextDia
			if req.OptMode == "graduated" {
				currentRed = math.Max(currentRed*0.88, 8.0)
			}
		}
	}

	startArea := math.Pi * math.Pow(req.Start/2, 2)
	endArea := math.Pi * math.Pow(req.End/2, 2)
	totalReduction := ((startArea - endArea) / startArea) * 100
	totalElongation := ((startArea / endArea) - 1) * 100

	resp := SequenceCalcResponse{
		Steps:           steps,
		TotalReduction:  totalReduction,
		TotalElongation: totalElongation,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(resp)
}

// Wire Drawing calculation schemas

type WireDrawingCalcRequest struct {
	Dies []float64 `json:"dies"`
}

type PassData struct {
	Pass           int     `json:"pass"`
	FromDie        float64 `json:"from_die"`
	ToDie          float64 `json:"to_die"`
	AreaBefore     float64 `json:"area_before"`
	AreaAfter      float64 `json:"area_after"`
	AreaReduction  float64 `json:"area_reduction"`
	Elongation     float64 `json:"elongation"`
	ReductionRatio float64 `json:"reduction_ratio"`
}

type WireDrawingStats struct {
	TotalPasses           int     `json:"total_passes"`
	StartingDie           float64 `json:"starting_die"`
	FinalDie              float64 `json:"final_die"`
	AvgElongation         float64 `json:"avg_elongation"`
	MaxElongation         float64 `json:"max_elongation"`
	MinElongation         float64 `json:"min_elongation"`
	AvgAreaReduction      float64 `json:"avg_area_reduction"`
	OverallAreaReduction  float64 `json:"overall_area_reduction"`
	OverallReductionRatio float64 `json:"overall_reduction_ratio"`
}

type ConsistencyData struct {
	AvgElongation float64 `json:"avg_elongation"`
	Variation     float64 `json:"variation"`
	QualityRating string  `json:"quality_rating"`
	Stars         int     `json:"stars"`
}

type WireDrawingCalcResponse struct {
	Passes      []PassData       `json:"passes"`
	Stats       WireDrawingStats `json:"stats"`
	Consistency ConsistencyData  `json:"consistency"`
}

func (h *Handler) HandleCalculateWireDrawing(w http.ResponseWriter, r *http.Request) {
	if !requirePost(w, r) {
		return
	}

	var req WireDrawingCalcRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeProblemDetails(w, r, "Bad Request", http.StatusBadRequest, "Invalid request JSON payload")
		return
	}

	if len(req.Dies) < 2 {
		resp := WireDrawingCalcResponse{
			Passes: []PassData{},
			Stats: WireDrawingStats{
				TotalPasses: 0,
				StartingDie: 0,
				FinalDie:    0,
			},
			Consistency: ConsistencyData{
				AvgElongation: 0,
				Variation:     0,
				QualityRating: "N/A",
				Stars:         0,
			},
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(resp)
		return
	}

	passes := make([]PassData, 0, len(req.Dies)-1)
	for i := 0; i < len(req.Dies)-1; i++ {
		fromDie := req.Dies[i]
		toDie := req.Dies[i+1]
		areaBefore := (math.Pi * fromDie * fromDie) / 4
		areaAfter := (math.Pi * toDie * toDie) / 4
		areaReduction := (1 - (toDie*toDie)/(fromDie*fromDie)) * 100
		elongation := ((fromDie*fromDie)/(toDie*toDie) - 1) * 100
		reductionRatio := (fromDie * fromDie) / (toDie * toDie)

		passes = append(passes, PassData{
			Pass:           i + 1,
			FromDie:        fromDie,
			ToDie:          toDie,
			AreaBefore:     areaBefore,
			AreaAfter:      areaAfter,
			AreaReduction:  areaReduction,
			Elongation:     elongation,
			ReductionRatio: reductionRatio,
		})
	}

	elongations := make([]float64, 0, len(passes))
	reductions := make([]float64, 0, len(passes))
	var sumElong, sumRed float64

	for _, p := range passes {
		elongations = append(elongations, p.Elongation)
		reductions = append(reductions, p.AreaReduction)
		sumElong += p.Elongation
		sumRed += p.AreaReduction
	}

	avgElong := sumElong / float64(len(passes))
	avgRed := sumRed / float64(len(passes))

	var maxElong, minElong float64
	if len(elongations) > 0 {
		maxElong = elongations[0]
		minElong = elongations[0]
		for _, e := range elongations {
			if e > maxElong {
				maxElong = e
			}
			if e < minElong {
				minElong = e
			}
		}
	}

	var maxDeviation float64
	for _, e := range elongations {
		dev := math.Abs(e - avgElong)
		if dev > maxDeviation {
			maxDeviation = dev
		}
	}

	var stars int
	var qualityRating string
	if maxDeviation <= 1 {
		stars = 5
		qualityRating = "Excellent"
	} else if maxDeviation <= 2 {
		stars = 4
		qualityRating = "Very Good"
	} else if maxDeviation <= 3 {
		stars = 3
		qualityRating = "Good"
	} else if maxDeviation <= 5 {
		stars = 2
		qualityRating = "Fair"
	} else {
		stars = 1
		qualityRating = "Poor"
	}

	startingDie := req.Dies[0]
	finalDie := req.Dies[len(req.Dies)-1]
	overallAreaReduction := (1 - (finalDie*finalDie)/(startingDie*startingDie)) * 100
	overallReductionRatio := (startingDie * startingDie) / (finalDie * finalDie)

	resp := WireDrawingCalcResponse{
		Passes: passes,
		Stats: WireDrawingStats{
			TotalPasses:           len(passes),
			StartingDie:           startingDie,
			FinalDie:              finalDie,
			AvgElongation:         avgElong,
			MaxElongation:         maxElong,
			MinElongation:         minElong,
			AvgAreaReduction:      avgRed,
			OverallAreaReduction:  overallAreaReduction,
			OverallReductionRatio: overallReductionRatio,
		},
		Consistency: ConsistencyData{
			AvgElongation: avgElong,
			Variation:     maxDeviation,
			QualityRating: qualityRating,
			Stars:         stars,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(resp)
}

// Pass Optimizer structs

type PassAssignmentInput struct {
	StartDia        float64 `json:"startDia"`
	TargetDia       float64 `json:"targetDia"`
	AvgReduction    float64 `json:"avgReduction"`
	OptMode         string  `json:"optMode"`
	MaterialType    string  `json:"materialType"`
	Lubrication     string  `json:"lubrication"`
	DrawSpeed       float64 `json:"drawSpeed"`
	DieAngle        float64 `json:"dieAngle"`
	SearchTolerance float64 `json:"searchTolerance"`
	CustomYield     float64 `json:"customYield,omitempty"`
}

type PassAssignmentInfo struct {
	Die          database.DieRepresentation `json:"die"`
	Status       string                     `json:"status"`
	SizeDelta    float64                    `json:"sizeDelta"`
	LocationText string                     `json:"locationText"`
}

type OptimizerPassResult struct {
	Step             SequenceStep        `json:"step"`
	Assignment       *PassAssignmentInfo `json:"assignment"`
	DrawStress       float64             `json:"drawStress"`
	FlowStress       float64             `json:"flowStress"`
	TempRise         float64             `json:"tempRise"`
	CentralBurstRisk string              `json:"centralBurstRisk"`
	PowerKw          float64             `json:"powerKw"`
}

type OptimizerResult struct {
	Passes          []OptimizerPassResult `json:"passes"`
	TotalReduction  float64               `json:"totalReduction"`
	TotalElongation float64               `json:"totalElongation"`
	GapsCount       int                   `json:"gapsCount"`
	AssignedCount   int                   `json:"assignedCount"`
	MaxStress       float64               `json:"maxStress"`
	MaxTempRise     float64               `json:"maxTempRise"`
	UsedDieIds      []string              `json:"usedDieIds"`
}

func (h *Handler) HandleOptimizePasses(w http.ResponseWriter, r *http.Request) {
	if !requirePost(w, r) {
		return
	}

	var req PassAssignmentInput
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeProblemDetails(w, r, "Bad Request", http.StatusBadRequest, "Invalid request JSON payload")
		return
	}

	if req.StartDia <= 0 || req.TargetDia <= 0 || req.StartDia <= req.TargetDia {
		writeProblemDetails(w, r, "Unprocessable Entity", http.StatusUnprocessableEntity, "Invalid start or target diameter parameters")
		return
	}

	matProps, exists := materialProps[req.MaterialType]
	if !exists {
		matProps = materialProps["copper_soft"]
	}

	mu := getFrictionCoefficient(req.Lubrication)
	alphaRad := (req.DieAngle * math.Pi) / 180

	steps := []SequenceStep{}
	currentDia := req.StartDia
	safetyCounter := 0
	currentRed := req.AvgReduction
	if req.OptMode == "graduated" {
		currentRed = math.Min(req.AvgReduction*1.25, 30.0)
	}

	for currentDia > req.TargetDia && safetyCounter < 50 {
		safetyCounter++
		targetRedMultiplier := 1 - currentRed/100
		nextArea := (math.Pi * math.Pow(currentDia/2, 2)) * targetRedMultiplier
		nextDia := 2 * math.Sqrt(nextArea/math.Pi)

		var stepInArea, stepOutArea, actualRed, actualElong, drawingRatio float64

		if nextDia <= req.TargetDia {
			stepInArea = math.Pi * math.Pow(currentDia/2, 2)
			stepOutArea = math.Pi * math.Pow(req.TargetDia/2, 2)
			actualRed = ((stepInArea - stepOutArea) / stepInArea) * 100
			actualElong = ((stepInArea / stepOutArea) - 1) * 100
			drawingRatio = stepInArea / stepOutArea

			steps = append(steps, SequenceStep{
				Draft:        len(steps) + 1,
				Inlet:        currentDia,
				Outlet:       req.TargetDia,
				Reduction:    actualRed,
				Elongation:   actualElong,
				DrawingRatio: drawingRatio,
			})
			break
		} else {
			stepInArea = math.Pi * math.Pow(currentDia/2, 2)
			stepOutArea = nextArea
			actualRed = currentRed
			actualElong = (1/targetRedMultiplier - 1) * 100
			drawingRatio = 1 / targetRedMultiplier

			steps = append(steps, SequenceStep{
				Draft:        len(steps) + 1,
				Inlet:        currentDia,
				Outlet:       nextDia,
				Reduction:    actualRed,
				Elongation:   actualElong,
				DrawingRatio: drawingRatio,
			})
			currentDia = nextDia
			if req.OptMode == "graduated" {
				currentRed = math.Max(currentRed*0.88, 8.0)
			}
		}
	}

	if len(steps) == 0 {
		writeProblemDetails(w, r, "Unprocessable Entity", http.StatusUnprocessableEntity, "No passes generated — check input parameters")
		return
	}

	usedDieIdsMap := make(map[string]bool)
	usedDieIdsList := []string{}
	passResults := []OptimizerPassResult{}

	var maxStress, maxTempRise float64

	for _, step := range steps {
		inArea := math.Pi * math.Pow(step.Inlet/2, 2)
		outArea := math.Pi * math.Pow(step.Outlet/2, 2)

		yieldVal := matProps.YieldStrength
		if req.CustomYield > 0 {
			yieldVal = req.CustomYield
		}
		flowStress := getFlowStress(inArea, outArea, yieldVal, req.MaterialType)
		drawStress := getDrawingStress(inArea, outArea, alphaRad, yieldVal, req.MaterialType, mu)
		powerKw := (outArea * drawStress * req.DrawSpeed) / 1000
		tempRise := (drawStress * (step.Elongation / 100)) / (matProps.Density * matProps.SpecificHeat)

		// Central burst risk (Hollomon)
		val := step.DrawingRatio * math.Sin(alphaRad)
		centralBurstRisk := "danger"
		if val > 1.4 {
			centralBurstRisk = "safe"
		} else if val > 1.0 {
			centralBurstRisk = "caution"
		}

		if drawStress > maxStress {
			maxStress = drawStress
		}
		if tempRise > maxTempRise {
			maxTempRise = tempRise
		}

		var assignment *PassAssignmentInfo = nil

		// Database Lookup & Ranking
		sizeMin := fmt.Sprintf("%.3f", step.Outlet-req.SearchTolerance)
		sizeMax := fmt.Sprintf("%.3f", step.Outlet+req.SearchTolerance)

		dies, err := h.db.QueryPostgresDirectly(r.Context(), "", "ROUND", "", "", sizeMin, sizeMax, "", "", "", "", "", "", "", 5, 0)
		if err == nil && len(dies) > 0 {
			// Rank matching dies
			var bestDie *database.DieRepresentation = nil
			var bestScore int = 999999
			var bestDelta float64 = 999999.0

			for _, d := range dies {
				if usedDieIdsMap[d.DieID] {
					continue
				}
				prio, ok := statusPriority[d.Status]
				if !ok {
					prio = 99
				}
				dieSize := 0.0
				if d.CurrentSize != nil {
					dieSize, _ = strconv.ParseFloat(*d.CurrentSize, 64)
				}
				delta := math.Abs(dieSize - step.Outlet)

				if prio < bestScore || (prio == bestScore && delta < bestDelta) {
					bestDie = &d
					bestScore = prio
					bestDelta = delta
				}
			}

			if bestDie != nil {
				usedDieIdsMap[bestDie.DieID] = true
				usedDieIdsList = append(usedDieIdsList, bestDie.DieID)

				locationText := bestDie.Location
				if bestDie.RackName != "" && bestDie.Shelf != nil && *bestDie.Shelf > 0 {
					locationText = fmt.Sprintf("%s - S%d", bestDie.RackName, *bestDie.Shelf)
				} else if locationText == "" {
					locationText = "Unassigned"
				}

				assignment = &PassAssignmentInfo{
					Die:          *bestDie,
					Status:       bestDie.Status,
					SizeDelta:    bestDelta,
					LocationText: locationText,
				}
			}
		}

		passResults = append(passResults, OptimizerPassResult{
			Step:             step,
			Assignment:       assignment,
			DrawStress:       drawStress,
			FlowStress:       flowStress,
			TempRise:         tempRise,
			CentralBurstRisk: centralBurstRisk,
			PowerKw:          powerKw,
		})
	}

	startArea := math.Pi * math.Pow(req.StartDia/2, 2)
	endArea := math.Pi * math.Pow(req.TargetDia/2, 2)
	totalReduction := ((startArea - endArea) / startArea) * 100
	totalElongation := ((startArea / endArea) - 1) * 100

	var gapsCount, assignedCount int
	for _, p := range passResults {
		if p.Assignment == nil {
			gapsCount++
		} else {
			assignedCount++
		}
	}

	resp := OptimizerResult{
		Passes:          passResults,
		TotalReduction:  totalReduction,
		TotalElongation: totalElongation,
		GapsCount:       gapsCount,
		AssignedCount:   assignedCount,
		MaxStress:       maxStress,
		MaxTempRise:     maxTempRise,
		UsedDieIds:      usedDieIdsList,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(resp)
}

// Material settings
type MaterialProp struct {
	Density       float64 // g/cm3
	SpecificHeat  float64 // J/g-C
	K             float64
	N             float64
	YieldStrength float64
}

var materialProps = map[string]MaterialProp{
	"copper_soft": {Density: 8.96, SpecificHeat: 0.385, K: 315, N: 0.54, YieldStrength: 70},
	"copper_hard": {Density: 8.96, SpecificHeat: 0.385, K: 450, N: 0.10, YieldStrength: 250},
	"aluminum":    {Density: 2.70, SpecificHeat: 0.900, K: 180, N: 0.20, YieldStrength: 80},
	"steel_low":   {Density: 7.85, SpecificHeat: 0.450, K: 530, N: 0.26, YieldStrength: 250},
}

var statusPriority = map[string]int{
	"AVAILABLE":   0,
	"RUNNING":     1,
	"CLEANING":    2,
	"POLISHING":   3,
	"MAINTENANCE": 4,
	"DAMAGED":     5,
	"SCRAPPED":    6,
	"MISSING":     7,
}

// Die Series schemas and logic

type DieSeriesRequest struct {
	Mode       string  `json:"mode"`
	DStart     float64 `json:"d_start"`
	DEnd       float64 `json:"d_end"`
	Elongation float64 `json:"elongation"`
	PassCount  int     `json:"pass_count"`
	ShowRange  bool    `json:"show_range"`
	RangeMin   float64 `json:"range_min"`
	RangeMax   float64 `json:"range_max"`
}

type DieSeriesResponse struct {
	Series        []float64  `json:"series"`
	Passes        []PassData `json:"passes"`
	AvgElongation float64    `json:"avg_elongation"`
}

func calculatePassCountForElongation(dStart, dEnd, elongation float64) int {
	if elongation <= 0 || dStart <= dEnd {
		return 0
	}
	factor := 1 + elongation/100
	ratio := dStart / dEnd
	return int(math.Ceil(math.Log(ratio) / math.Log(math.Sqrt(factor))))
}

func generateDieSeriesFromElongation(dStart, dEnd, elongation, rangeMin, rangeMax float64, hasRange bool) []float64 {
	maxPasses := calculatePassCountForElongation(dStart, dEnd, elongation)
	if maxPasses <= 0 {
		return []float64{dStart}
	}

	if !hasRange || maxPasses <= 1 {
		factor := math.Sqrt(1 + elongation/100)
		series := []float64{dStart}
		for i := 1; i <= maxPasses; i++ {
			val := dStart / math.Pow(factor, float64(i))
			series = append(series, math.Round(val*1000)/1000)
		}
		if series[len(series)-1] < dEnd {
			series[len(series)-1] = dEnd
		}
		return series
	}

	factor := math.Sqrt(1 + elongation/100)
	for mainPasses := maxPasses; mainPasses >= 1; mainPasses-- {
		dAfterMain := dStart / math.Pow(factor, float64(mainPasses))
		finalElong := ((dAfterMain*dAfterMain)/(dEnd*dEnd) - 1) * 100

		if finalElong >= rangeMin-0.01 && finalElong <= rangeMax+0.01 {
			series := []float64{dStart}
			for i := 1; i <= mainPasses; i++ {
				val := dStart / math.Pow(factor, float64(i))
				series = append(series, math.Round(val*1000)/1000)
			}
			clampedElong := math.Max(rangeMin, math.Min(rangeMax, finalElong))
			dFinal := dAfterMain / math.Sqrt(1+clampedElong/100)
			series = append(series, math.Round(dFinal*1000)/1000)
			if series[len(series)-1] < dEnd {
				series[len(series)-1] = dEnd
			}
			return series
		}
	}

	series := []float64{dStart}
	for i := 1; i <= maxPasses; i++ {
		val := dStart / math.Pow(factor, float64(i))
		series = append(series, math.Round(val*1000)/1000)
	}
	dAfterMain := series[len(series)-1]
	clampedElong := math.Max(rangeMin, math.Min(rangeMax, elongation))
	dFinal := dAfterMain / math.Sqrt(1+clampedElong/100)
	series = append(series, math.Round(dFinal*1000)/1000)
	if series[len(series)-1] < dEnd {
		series[len(series)-1] = dEnd
	}
	return series
}

func generateDieSeriesFromPasses(dStart, elongation, rangeMin, rangeMax float64, passCount int, hasRange bool) []float64 {
	if passCount <= 0 || elongation <= 0 {
		return []float64{dStart}
	}

	factor := math.Sqrt(1 + elongation/100)
	series := []float64{dStart}

	if passCount <= 2 || !hasRange {
		for i := 1; i <= passCount; i++ {
			val := dStart / math.Pow(factor, float64(i))
			series = append(series, math.Round(val*1000)/1000)
		}
		return series
	}

	for i := 1; i <= passCount-1; i++ {
		val := dStart / math.Pow(factor, float64(i))
		series = append(series, math.Round(val*1000)/1000)
	}

	dAfterMain := series[len(series)-1]
	finalElong := math.Max(rangeMin, math.Min(rangeMax, elongation))
	dFinal := dAfterMain / math.Sqrt(1+finalElong/100)
	series = append(series, math.Round(dFinal*1000)/1000)
	return series
}

func (h *Handler) HandleGenerateDieSeries(w http.ResponseWriter, r *http.Request) {
	if !requirePost(w, r) {
		return
	}

	var req DieSeriesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeProblemDetails(w, r, "Bad Request", http.StatusBadRequest, "Invalid request JSON payload")
		return
	}

	if req.DStart <= 0 || req.Elongation <= 0 {
		writeProblemDetails(w, r, "Unprocessable Entity", http.StatusUnprocessableEntity, "d_start and elongation must be greater than 0")
		return
	}

	var series []float64
	if req.Mode == "target" {
		if req.DEnd <= 0 || req.DEnd >= req.DStart {
			writeProblemDetails(w, r, "Unprocessable Entity", http.StatusUnprocessableEntity, "d_end must be greater than 0 and less than d_start")
			return
		}
		series = generateDieSeriesFromElongation(req.DStart, req.DEnd, req.Elongation, req.RangeMin, req.RangeMax, req.ShowRange)
	} else {
		if req.PassCount <= 0 {
			writeProblemDetails(w, r, "Unprocessable Entity", http.StatusUnprocessableEntity, "pass_count must be greater than 0")
			return
		}
		series = generateDieSeriesFromPasses(req.DStart, req.Elongation, req.RangeMin, req.RangeMax, req.PassCount, req.ShowRange)
	}

	passes := make([]PassData, 0, len(series)-1)
	var sumElong float64
	for i := 0; i < len(series)-1; i++ {
		fromDie := series[i]
		toDie := series[i+1]
		areaBefore := (math.Pi * fromDie * fromDie) / 4
		areaAfter := (math.Pi * toDie * toDie) / 4
		areaReduction := (1 - (toDie*toDie)/(fromDie*fromDie)) * 100
		elongation := ((fromDie*fromDie)/(toDie*toDie) - 1) * 100
		reductionRatio := (fromDie * fromDie) / (toDie * toDie)
		sumElong += elongation

		passes = append(passes, PassData{
			Pass:           i + 1,
			FromDie:        fromDie,
			ToDie:          toDie,
			AreaBefore:     areaBefore,
			AreaAfter:      areaAfter,
			AreaReduction:  areaReduction,
			Elongation:     elongation,
			ReductionRatio: reductionRatio,
		})
	}

	var avgElong float64
	if len(passes) > 0 {
		avgElong = sumElong / float64(len(passes))
	}

	resp := DieSeriesResponse{
		Series:        series,
		Passes:        passes,
		AvgElongation: avgElong,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(resp)
}
