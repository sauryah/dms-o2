# Go API Microservice (go-api.md)

## Purpose
Handles high-throughput read operations: Go search parser, Meilisearch index querying, Redis caches, and real-time Server-Sent Events (SSE) broadcasts.

## Important Files
- [main.go](file:///home/sahil/Desktop/Projects/dms-o2/go-api/cmd/server/main.go): Service entries and router maps.
- [auth.go](file:///home/sahil/Desktop/Projects/dms-o2/go-api/internal/auth/auth.go): Token verification client.
- [events.go](file:///home/sahil/Desktop/Projects/dms-o2/go-api/internal/events/events.go): SSE listener and channel manager.
