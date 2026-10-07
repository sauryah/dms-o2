# Go API Microservice (go-api.md)

## Purpose
Handles high-throughput read operations: high-performance search proxy, Meilisearch index querying, PostgreSQL fallback search, atomic Redis caching, wire drawing calculations, and real-time Server-Sent Events (SSE) broadcasts.

## Important Files
- [main.go](file:///go-api/cmd/server/main.go): Service entrypoint, route registrations, and graceful shutdown handling.
- [handlers.go](file:///go-api/internal/handlers/handlers.go): Search handler, scoring engine, unit normalization, database stats, and tool calculation endpoints (`/wire-drawing`, `/die-series`).
- [search.go](file:///go-api/internal/search/search.go): Meilisearch client wrapper with query scoring and strict digit filtering.
- [database.go](file:///go-api/internal/database/database.go): Direct PostgreSQL query builder `buildWhereClauses` with parameterized numeric prefix matching and connection pool telemetry.
- [cache.go](file:///go-api/internal/cache/cache.go): Redis caching layer with $O(1)$ generation counter invalidation (`search_cache_gen`).
- [auth.go](file:///go-api/internal/auth/auth.go): JWT token and SSE single-use ticket verification client.
- [events.go](file:///go-api/internal/events/events.go): SSE listener and Redis pub/sub channel manager.

## Key Service Endpoints
- `GET /api/go/health`: Health status probe returning service status and dependencies.
- `GET /api/go/liveness`: Kubernetes/container liveness probe.
- `GET /api/go/readiness`: Readiness probe checking PostgreSQL and Redis connectivity.
- `GET /api/go/search`: High-performance search proxy querying Meilisearch with PostgreSQL fallback.
- `GET /api/go/stats`: Global die inventory and machine allocation aggregates.
- `GET /api/go/db-stats`: Connection pool status, open connections, and latency metrics.
- `GET /api/go/metrics`: Prometheus metrics exposition for HTTP requests, SSE subscribers, and calculation durations.
- `GET /api/events/`: Real-time Server-Sent Events (SSE) listener authenticated via single-use ticket.
- `GET /api/go/index-status`: Meilisearch index sync state and document count.
- `GET /api/go/import-status`: Spreadsheet import status.
- `POST /api/go/tools/calculate/wire-drawing`: Drafting schedule, cumulative reduction, and multi-pass elongation calculator.
- `POST /api/go/tools/calculate/die-series`: Automated die step series generator according to reduction criteria.

## Key Search & Scoring Rules
- **Size & Dimension Precision**: Dimension fields (`CurrentSize`, `CurrentWidth`, `CurrentThickness`) use exact numeric match (score 100) or prefix match (score 70). String substring matches (like `1.25` matching query `25`) are explicitly excluded.
- **Digit Query Strict Filtering**: When a query contains digits, results with `score <= 50` are filtered out across both Meilisearch and direct SQL search paths.
- **Atomic Cache Invalidation ($O(1)$)**: Search cache keys incorporate the generation counter: `search:<gen>:<hash>`. Django increments `search_cache_gen` on die mutations, rendering all prior cached search pages obsolete without executing expensive Redis `KEYS` or `SCAN` operations.

