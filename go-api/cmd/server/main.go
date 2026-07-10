package main

import (
	"context"
	"log/slog"
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
	// Configure slog JSON logger
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, nil)))

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		slog.Error("Configuration error", "error", err)
		os.Exit(1)
	}

	// Connect to PostgreSQL
	db, err := database.NewPostgresDB(cfg)
	if err != nil {
		slog.Error("Could not connect to PostgreSQL database", "error", err)
		os.Exit(1)
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
	jwtAuth := auth.AuthMiddleware(cfg, redisClient)

	mux.Handle("GET /api/go/search", jwtAuth(http.HandlerFunc(handler.HandleSearch)))
	mux.Handle("GET /api/go/stats", jwtAuth(http.HandlerFunc(handler.HandleStats)))
	mux.Handle("GET /api/events/", jwtAuth(http.HandlerFunc(handler.HandleEvents)))
	mux.Handle("GET /api/go/index-status", jwtAuth(http.HandlerFunc(handler.HandleIndexStatus)))
	mux.Handle("GET /api/go/import-status", jwtAuth(http.HandlerFunc(handler.HandleImportStatus)))

	port := cfg.Port

	loggingMux := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		mux.ServeHTTP(w, r)
		slog.Info("HTTP request", "remote_addr", r.RemoteAddr, "method", r.Method, "url", r.URL.String(), "duration", time.Since(start))
	})

	server := &http.Server{
		Addr:    ":" + port,
		Handler: loggingMux,
	}

	stopChan := make(chan os.Signal, 1)
	signal.Notify(stopChan, os.Interrupt, syscall.SIGTERM)

	go func() {
		slog.Info("Go Search Service listening", "port", port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("ListenAndServe error", "error", err)
			os.Exit(1)
		}
	}()

	sig := <-stopChan
	slog.Info("Received signal. Initiating graceful shutdown...", "signal", sig)

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		slog.Error("HTTP server Shutdown error", "error", err)
	}

	slog.Info("Closing PostgreSQL database connections...")
	db.Close()
	slog.Info("Go Search Service stopped cleanly.")
}
