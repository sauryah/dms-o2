# Go API Microservice (go-api.md)

## Purpose
Handles high-throughput read operations: Go search parser, Meilisearch index querying, Redis caches, and real-time Server-Sent Events (SSE) broadcasts.

## Important Files
- [main.go](file:///D:/DMS/dms-o2/go-api/cmd/server/main.go): Service entries and router maps.
- [handlers.go](file:///D:/DMS/dms-o2/go-api/internal/handlers/handlers.go): Search handler, `scoreDie` relevance calculation, unit normalization, and score filtering.
- [database.go](file:///D:/DMS/dms-o2/go-api/internal/database/database.go): Direct PostgreSQL query builder `buildWhereClauses` with parameterized numeric prefix matching.
- [auth.go](file:///D:/DMS/dms-o2/go-api/internal/auth/auth.go): Token verification client.
- [events.go](file:///D:/DMS/dms-o2/go-api/internal/events/events.go): SSE listener and channel manager.

## Key Search & Scoring Rules
- **Size & Dimension Precision**: Dimension fields (`CurrentSize`, `CurrentWidth`, `CurrentThickness`) use exact numeric match (score 100) or prefix match (score 70). String substring matches (like `1.25` matching query `25`) are explicitly excluded.
- **Digit Query Strict Filtering**: When a query contains digits, results with `score <= 50` are filtered out across both Meilisearch and direct SQL search paths.
