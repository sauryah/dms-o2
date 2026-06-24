package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"dms-go-api/internal/auth"
	"dms-go-api/internal/cache"
	"dms-go-api/internal/config"
	"dms-go-api/internal/database"
	"dms-go-api/internal/events"
	"dms-go-api/internal/handlers"
	"dms-go-api/internal/search"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Configuration error: %v", err)
	}

	// Connect to PostgreSQL
	db, err := database.NewPostgresDB(cfg)
	if err != nil {
		log.Fatalf("Could not connect to PostgreSQL database: %v", err)
	}

	// Connect to Meilisearch
	meiliClient := search.NewSearchClient(cfg)

	// Connect to Redis
	redisClient := cache.NewCache(cfg)

	// Create and start Event Manager for SSE broadcasts
	eventManager := events.NewEventManager()
	go eventManager.Start()

	// Create Handler containing dependencies and state
	handler := handlers.NewHandler(cfg, db, redisClient, meiliClient, eventManager)

	// Start PostgreSQL event listener for Redis cache invalidation & SSE broadcasts
	events.StartEventListener(cfg, eventManager, func() {
		redisClient.Invalidate(context.Background())
	})

	// Start Index Reconciliation Scheduler
	handler.StartReconciliationScheduler()

	// Register HTTP handlers
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/go/health", handler.HandleHealth)

	// Create middleware
	jwtAuth := auth.AuthMiddleware(cfg, db)

	mux.Handle("GET /api/go/search", jwtAuth(http.HandlerFunc(handler.HandleSearch)))
	mux.Handle("GET /api/go/stats", jwtAuth(http.HandlerFunc(handler.HandleStats)))
	mux.Handle("GET /api/events/", jwtAuth(http.HandlerFunc(handler.HandleEvents)))

	port := cfg.Port

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

	log.Println("Closing PostgreSQL database connections...")
	db.Close()
	log.Println("Go Search Service stopped cleanly.")
}
