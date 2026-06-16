package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/golang-jwt/jwt/v4"
	"github.com/lib/pq"
	"github.com/meilisearch/meilisearch-go"
	"github.com/redis/go-redis/v9"
)

var (
	db          *sql.DB
	meiliClient *meilisearch.Client
	redisClient *redis.Client
	ctx         = context.Background()
	indexName   = "dies"

	lastReconciliationTime time.Time
	reconciliationStatus   = "pending"
	postgresCount          = 0
	meiliCount             = 0
)

// DieRepresentation matches the JSON structure expected by the React frontend.
type DieRepresentation struct {
	ID               int64   `json:"-"`
	DieID            string  `json:"die_id"`
	DieType          string  `json:"die_type"`
	Casing           string  `json:"casing"`
	Status           string  `json:"status"`
	Location         string  `json:"location"`
	SetName          string  `json:"set_name"`
	MachineName      string  `json:"machine_name"`
	CurrentSet       *int    `json:"current_set"`
	CurrentSize      *string `json:"current_size,omitempty"`
	CurrentWidth     *string `json:"current_width,omitempty"`
	CurrentThickness *string `json:"current_thickness,omitempty"`
	Radius           *string `json:"radius,omitempty"`
}

func main() {
	// 1. Connect to PostgreSQL
	initPostgres()

	// 2. Connect to Meilisearch
	initMeilisearch()

	// 3. Connect to Redis
	initRedis()

	// 4. Start Index Reconciliation Scheduler
	startReconciliationScheduler()

	// 3. Register HTTP handlers
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/go/health", handleHealth)
	mux.Handle("GET /api/go/search", authMiddleware(http.HandlerFunc(handleSearch)))
	mux.Handle("GET /api/go/stats", authMiddleware(http.HandlerFunc(handleStats)))

	port := getEnv("PORT", "8080")
	
	loggingMux := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		mux.ServeHTTP(w, r)
		log.Printf("%s %s %s %s", r.RemoteAddr, r.Method, r.URL.String(), time.Since(start))
	})

	server := &http.Server{
		Addr:    ":" + port,
		Handler: loggingMux,
	}

	stopChan := make(chan os.Signal, 1)
	signal.Notify(stopChan, os.Interrupt, syscall.SIGTERM)

	go func() {
		log.Printf("Go Search Service listening on port %s...", port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("ListenAndServe error: %v", err)
		}
	}()

	sig := <-stopChan
	log.Printf("Received signal %v. Initiating graceful shutdown...", sig)

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Printf("HTTP server Shutdown error: %v", err)
	}

	if db != nil {
		log.Println("Closing PostgreSQL database connections...")
		db.Close()
	}
	log.Println("Go Search Service stopped cleanly.")
}

func initPostgres() {
	connStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		getEnv("POSTGRES_HOST", "db"),
		getEnv("POSTGRES_PORT", "5432"),
		getEnv("POSTGRES_USER", "dms_user"),
		getEnv("POSTGRES_PASSWORD", "dms_pass_123"),
		getEnv("POSTGRES_DB", "dms"),
	)

	var err error
	for i := 0; i < 5; i++ {
		db, err = sql.Open("postgres", connStr)
		if err == nil {
			err = db.Ping()
			if err == nil {
				log.Println("Successfully connected to PostgreSQL database.")
				db.SetMaxIdleConns(10)
				db.SetMaxOpenConns(50)
				return
			}
		}
		log.Printf("Failed to connect to database (attempt %d/5): %v. Retrying in 2s...", i+1, err)
		time.Sleep(2 * time.Second)
	}
	log.Fatal("Could not connect to PostgreSQL database: ", err)
}

func initMeilisearch() {
	host := getEnv("MEILI_HOST", "http://meilisearch:7700")
	key := getEnv("MEILI_SEARCH_KEY", "")
	if key == "" {
		key = getEnv("MEILI_MASTER_KEY", "meili-master-key-secure-12345")
	}
	meiliClient = meilisearch.NewClient(meilisearch.ClientConfig{
		Host:   host,
		APIKey: key,
	})
	log.Printf("Meilisearch client initialized with host %s", host)
}

func initRedis() {
	redisHost := getEnv("REDIS_HOST", "localhost")
	redisPort := getEnv("REDIS_PORT", "6379")
	addr := fmt.Sprintf("%s:%s", redisHost, redisPort)

	redisClient = redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: "", // no password set by default
		DB:       0,  // use default DB
	})

	// Ping connection
	err := redisClient.Ping(ctx).Err()
	if err != nil {
		log.Printf("Warning: Failed to connect to Redis at %s: %v. Caching will be disabled.", addr, err)
		redisClient = nil
	} else {
		log.Printf("Successfully connected to Redis at %s.", addr)
	}
}

func authMiddleware(next http.Handler) http.Handler {
	secretKey := []byte(getEnv("DJANGO_SECRET_KEY", "change_me"))

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			// No token provided; allow guest access (AllowAny equivalent)
			next.ServeHTTP(w, r)
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"error": "Authorization header must be Bearer token"})
			return
		}

		tokenStr := parts[1]

		// Parse and validate signature
		token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return secretKey, nil
		})

		if err != nil || !token.Valid {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"error": "Invalid or expired token"})
			return
		}

		next.ServeHTTP(w, r)
	})
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	resp := map[string]interface{}{
		"status": "ok",
		"reconciliation": map[string]interface{}{
			"last_run":       lastReconciliationTime.Format(time.RFC3339),
			"status":         reconciliationStatus,
			"postgres_count": postgresCount,
			"meili_count":    meiliCount,
		},
	}
	json.NewEncoder(w).Encode(resp)
}

func runReconciliation() {
	log.Println("Starting Search Index Reconciliation...")

	// 1. Get Postgres count
	var pgCount int
	err := db.QueryRow("SELECT COUNT(*) FROM dies_die").Scan(&pgCount)
	if err != nil {
		log.Printf("Reconciliation error: Failed to count Postgres records: %v", err)
		reconciliationStatus = "error_postgres"
		lastReconciliationTime = time.Now()
		return
	}

	// 2. Get Meilisearch count
	meiliIndex := meiliClient.Index(indexName)
	stats, err := meiliIndex.GetStats()
	if err != nil {
		log.Printf("Reconciliation error: Failed to get Meilisearch stats: %v", err)
		reconciliationStatus = "error_meilisearch"
		lastReconciliationTime = time.Now()
		return
	}
	mCount := int(stats.NumberOfDocuments)

	// 3. Update status
	postgresCount = pgCount
	meiliCount = mCount
	lastReconciliationTime = time.Now()

	if pgCount == mCount {
		reconciliationStatus = "in_sync"
		log.Printf("Reconciliation Success: Index is in sync. Total dies: %d.", pgCount)
	} else {
		reconciliationStatus = "out_of_sync"
		log.Printf("WARNING: Search Index Mismatch! PostgreSQL has %d records, but Meilisearch has %d documents.", pgCount, mCount)
	}
}

func startReconciliationScheduler() {
	// Run once immediately on boot after connections are established
	go func() {
		// Wait 5 seconds to ensure DB and Meili are fully ready
		time.Sleep(5 * time.Second)
		runReconciliation()

		// Tick every 24 hours
		ticker := time.NewTicker(24 * time.Hour)
		defer ticker.Stop()
		for range ticker.C {
			runReconciliation()
		}
	}()
}

func handleStats(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// Try to fetch from Redis
	if redisClient != nil {
		cachedBytes, err := redisClient.Get(ctx, "stats").Bytes()
		if err == nil {
			w.WriteHeader(http.StatusOK)
			w.Write(cachedBytes)
			return
		}
	}

	rows, err := db.Query("SELECT status, COUNT(*) FROM dies_die GROUP BY status")
	if err != nil {
		log.Printf("Failed to query statistics: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}
	defer rows.Close()

	stats := map[string]int{
		"AVAILABLE": 0,
		"RUNNING":   0,
		"CLEANING":  0,
		"POLISHING": 0,
		"DAMAGED":   0,
		"SCRAPPED":  0,
		"MISSING":   0,
	}
	total := 0

	for rows.Next() {
		var status string
		var count int
		if err := rows.Scan(&status, &count); err != nil {
			log.Printf("Failed to scan statistics row: %v", err)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
			return
		}
		stats[status] = count
		total += count
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
	if redisClient != nil {
		err = redisClient.Set(ctx, "stats", respBytes, 15*time.Second).Err()
		if err != nil {
			log.Printf("Warning: Failed to save stats to Redis: %v", err)
		}
	}

	w.WriteHeader(http.StatusOK)
	w.Write(respBytes)
}

func handleSearch(w http.ResponseWriter, r *http.Request) {
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

	cacheKey := fmt.Sprintf("search:%s:%s:%s:%s:%s:%s:%s:%s:%s:%s:%s",
		q, dieType, statusVal, location, casing,
		sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax,
	)

	// Try to fetch from Redis
	if redisClient != nil {
		cachedBytes, err := redisClient.Get(ctx, cacheKey).Bytes()
		if err == nil {
			w.WriteHeader(http.StatusOK)
			w.Write(cachedBytes)
			return
		}
	}

	var dies []DieRepresentation
	var err error

	if q == "" {
		// 1. Direct database query
		dies, err = queryPostgresDirectly(dieType, statusVal, location, casing, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax)
	} else {
		// 2. Query Meilisearch first, then database
		dies, err = queryMeilisearchAndPostgres(q, dieType, statusVal, location, casing, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax)
	}

	if err != nil {
		log.Printf("Search query failed: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	respBytes, err := json.Marshal(dies)
	if err != nil {
		log.Printf("Failed to marshal search response: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	// Cache in Redis for 10 seconds
	if redisClient != nil {
		err = redisClient.Set(ctx, cacheKey, respBytes, 10*time.Second).Err()
		if err != nil {
			log.Printf("Warning: Failed to save search results to Redis: %v", err)
		}
	}

	w.WriteHeader(http.StatusOK)
	w.Write(respBytes)
}

func queryPostgresDirectly(dieType, statusVal, location, casing, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax string) ([]DieRepresentation, error) {
	var sqlParts []string
	var args []interface{}
	argCounter := 1

	sqlParts = append(sqlParts, `
		SELECT 
			d.id, d.die_id, d.die_type, d.casing, d.status, d.location, d.current_set_id,
			s.name as set_name,
			m.name as machine_name,
			r.current_size,
			f.current_width, f.current_thickness, f.radius
		FROM dies_die d
		LEFT JOIN machines_set s ON d.current_set_id = s.id
		LEFT JOIN machines_machine m ON s.machine_id = m.id
		LEFT JOIN dies_rounddie r ON d.id = r.die_id
		LEFT JOIN dies_flatdie f ON d.id = f.die_id
		WHERE 1=1
	`)

	if dieType != "" {
		sqlParts = append(sqlParts, fmt.Sprintf("AND d.die_type = $%d", argCounter))
		args = append(args, dieType)
		argCounter++
	}
	if statusVal != "" {
		sqlParts = append(sqlParts, fmt.Sprintf("AND d.status = $%d", argCounter))
		args = append(args, statusVal)
		argCounter++
	}
	if location != "" {
		sqlParts = append(sqlParts, fmt.Sprintf("AND d.location ILIKE $%d", argCounter))
		args = append(args, "%"+location+"%")
		argCounter++
	}
	if casing != "" {
		sqlParts = append(sqlParts, fmt.Sprintf("AND d.casing = $%d", argCounter))
		args = append(args, casing)
		argCounter++
	}

	if sizeMin != "" {
		sqlParts = append(sqlParts, fmt.Sprintf("AND r.current_size >= $%d", argCounter))
		args = append(args, sizeMin)
		argCounter++
	}
	if sizeMax != "" {
		sqlParts = append(sqlParts, fmt.Sprintf("AND r.current_size <= $%d", argCounter))
		args = append(args, sizeMax)
		argCounter++
	}

	if widthMin != "" {
		sqlParts = append(sqlParts, fmt.Sprintf("AND f.current_width >= $%d", argCounter))
		args = append(args, widthMin)
		argCounter++
	}
	if widthMax != "" {
		sqlParts = append(sqlParts, fmt.Sprintf("AND f.current_width <= $%d", argCounter))
		args = append(args, widthMax)
		argCounter++
	}

	if thickMin != "" {
		sqlParts = append(sqlParts, fmt.Sprintf("AND f.current_thickness >= $%d", argCounter))
		args = append(args, thickMin)
		argCounter++
	}
	if thickMax != "" {
		sqlParts = append(sqlParts, fmt.Sprintf("AND f.current_thickness <= $%d", argCounter))
		args = append(args, thickMax)
		argCounter++
	}

	sqlParts = append(sqlParts, "ORDER BY d.die_id ASC LIMIT 10000")

	query := strings.Join(sqlParts, "\n")
	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanDies(rows)
}

func escapeMeiliString(s string) string {
	return strings.ReplaceAll(s, "'", "\\'")
}

func queryMeilisearchAndPostgres(q, dieType, statusVal, location, casing, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax string) ([]DieRepresentation, error) {
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
		Limit: 10000,
	}
	if len(filters) > 0 {
		searchParams.Filter = strings.Join(filters, " AND ")
	}

	// Search Meilisearch index
	res, err := meiliClient.Index(indexName).Search(q, &searchParams)
	if err != nil {
		log.Printf("Meilisearch search error: %v. Falling back to DB search.", err)
		return queryPostgresDirectly(dieType, statusVal, location, casing, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax)
	}

	if len(res.Hits) == 0 {
		return []DieRepresentation{}, nil
	}

	// Extract matching document IDs (which are die database integer IDs as strings)
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
		return []DieRepresentation{}, nil
	}

	// Fetch detail records from Postgres
	var sqlParts []string
	var args []interface{}
	argCounter := 1

	sqlParts = append(sqlParts, `
		SELECT 
			d.id, d.die_id, d.die_type, d.casing, d.status, d.location, d.current_set_id,
			s.name as set_name,
			m.name as machine_name,
			r.current_size,
			f.current_width, f.current_thickness, f.radius
		FROM dies_die d
		LEFT JOIN machines_set s ON d.current_set_id = s.id
		LEFT JOIN machines_machine m ON s.machine_id = m.id
		LEFT JOIN dies_rounddie r ON d.id = r.die_id
		LEFT JOIN dies_flatdie f ON d.id = f.die_id
		WHERE d.id = ANY($1)
	`)
	args = append(args, pq.Array(hitIDs))
	argCounter++

	if sizeMin != "" {
		sqlParts = append(sqlParts, fmt.Sprintf("AND r.current_size >= $%d", argCounter))
		args = append(args, sizeMin)
		argCounter++
	}
	if sizeMax != "" {
		sqlParts = append(sqlParts, fmt.Sprintf("AND r.current_size <= $%d", argCounter))
		args = append(args, sizeMax)
		argCounter++
	}

	if widthMin != "" {
		sqlParts = append(sqlParts, fmt.Sprintf("AND f.current_width >= $%d", argCounter))
		args = append(args, widthMin)
		argCounter++
	}
	if widthMax != "" {
		sqlParts = append(sqlParts, fmt.Sprintf("AND f.current_width <= $%d", argCounter))
		args = append(args, widthMax)
		argCounter++
	}

	if thickMin != "" {
		sqlParts = append(sqlParts, fmt.Sprintf("AND f.current_thickness >= $%d", argCounter))
		args = append(args, thickMin)
		argCounter++
	}
	if thickMax != "" {
		sqlParts = append(sqlParts, fmt.Sprintf("AND f.current_thickness <= $%d", argCounter))
		args = append(args, thickMax)
		argCounter++
	}

	query := strings.Join(sqlParts, "\n")
	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	dies, err := scanDies(rows)
	if err != nil {
		return nil, err
	}

	// Reorder dies according to Meilisearch hit order
	dieMap := make(map[int64]DieRepresentation)
	for _, die := range dies {
		dieMap[die.ID] = die
	}

	var orderedDies []DieRepresentation
	for _, hid := range hitIDs {
		if die, ok := dieMap[hid]; ok {
			orderedDies = append(orderedDies, die)
		}
	}

	return orderedDies, nil
}

func scanDies(rows *sql.Rows) ([]DieRepresentation, error) {
	var dies []DieRepresentation
	for rows.Next() {
		var d DieRepresentation
		var setID sql.NullInt64
		var setName, machineName sql.NullString
		var size, width, thickness, radius sql.NullString

		err := rows.Scan(
			&d.ID, &d.DieID, &d.DieType, &d.Casing, &d.Status, &d.Location, &setID,
			&setName, &machineName, &size, &width, &thickness, &radius,
		)
		if err != nil {
			return nil, err
		}

		if setID.Valid {
			val := int(setID.Int64)
			d.CurrentSet = &val
		}
		if setName.Valid {
			d.SetName = setName.String
		}
		if machineName.Valid {
			d.MachineName = machineName.String
		}

		if d.DieType == "ROUND" && size.Valid {
			d.CurrentSize = &size.String
		} else if d.DieType == "FLAT" {
			if width.Valid {
				d.CurrentWidth = &width.String
			}
			if thickness.Valid {
				d.CurrentThickness = &thickness.String
			}
			if radius.Valid {
				d.Radius = &radius.String
			}
		}

		dies = append(dies, d)
	}
	return dies, nil
}


func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
