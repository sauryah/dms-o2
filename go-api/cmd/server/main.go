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
	"dms-go-api/internal/middleware"
	"dms-go-api/internal/search"
)

type statusResponseWriter struct {
	http.ResponseWriter
	status int
}

func (w *statusResponseWriter) WriteHeader(code int) {
	w.status = code
	w.ResponseWriter.WriteHeader(code)
}

func main() {
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, nil)))

	cfg, err := config.Load()
	if err != nil {
		slog.Error("Configuration error", "error", err)
		os.Exit(1)
	}

	db, err := database.NewPostgresDB(cfg)
	if err != nil {
		slog.Error("Could not connect to PostgreSQL database", "error", err)
		os.Exit(1)
	}

	meiliClient := search.NewSearchClient(cfg)
	redisClient := cache.NewCache(cfg)

	eventManager := events.NewEventManager()
	go eventManager.Start()

	handler := handlers.NewHandler(cfg, db, redisClient, meiliClient, eventManager)

	// Start PostgreSQL event listener for Redis cache invalidation & SSE broadcasts
	events.StartEventListener(cfg, eventManager, func() {
		redisClient.Invalidate(context.Background())
	})

	handler.StartReconciliationScheduler()

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/go/health", handler.HandleHealth)
	mux.HandleFunc("GET /api/go/liveness", handler.HandleLiveness)
	mux.HandleFunc("GET /api/go/readiness", handler.HandleReadiness)

	jwtAuth := auth.AuthMiddleware(cfg, redisClient)

	mux.Handle("GET /api/go/search", jwtAuth(http.HandlerFunc(handler.HandleSearch)))
	mux.Handle("GET /api/go/stats", jwtAuth(http.HandlerFunc(handler.HandleStats)))
	mux.Handle("GET /api/events/", http.HandlerFunc(handler.HandleEvents))
	mux.Handle("GET /api/go/index-status", jwtAuth(http.HandlerFunc(handler.HandleIndexStatus)))
	mux.Handle("GET /api/go/import-status", jwtAuth(http.HandlerFunc(handler.HandleImportStatus)))
	mux.Handle("POST /api/go/tools/calculate/round", jwtAuth(http.HandlerFunc(handler.HandleCalculateRound)))
	mux.Handle("POST /api/go/tools/calculate/flat", jwtAuth(http.HandlerFunc(handler.HandleCalculateFlat)))
	mux.Handle("POST /api/go/tools/calculate/sequence", jwtAuth(http.HandlerFunc(handler.HandleCalculateSequence)))
	mux.Handle("POST /api/go/tools/calculate/wire-drawing", jwtAuth(http.HandlerFunc(handler.HandleCalculateWireDrawing)))
	mux.Handle("POST /api/go/tools/optimize-passes", jwtAuth(http.HandlerFunc(handler.HandleOptimizePasses)))
	mux.Handle("POST /api/go/tools/calculate/die-series", jwtAuth(http.HandlerFunc(handler.HandleGenerateDieSeries)))
	mux.Handle("POST /api/go/tools/calculate/die-set", jwtAuth(http.HandlerFunc(handler.HandleCalculateDieSet)))

	port := cfg.Port

	loggingMux := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		recorder := &statusResponseWriter{ResponseWriter: w, status: http.StatusOK}
		mux.ServeHTTP(recorder, r)
		slog.Info("HTTP request", "remote_addr", r.RemoteAddr, "method", r.Method, "url", r.URL.String(), "status", recorder.status, "duration", time.Since(start))
	})

	// Apply rate limiting, security headers, and request size limits
	rateLimitedMux := middleware.RateLimit(loggingMux, 5.0, 20.0)
	secureMux := middleware.SecurityHeaders(rateLimitedMux)
	limitedMux := middleware.MaxBytesReader(secureMux, 10<<20)

	server := &http.Server{
		Addr:              ":" + port,
		Handler:           limitedMux,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       120 * time.Second,
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
