# Architecture Decision Records (decisions.md)

## ADR 1: Hybrid Write/Read Service Split
*   **Date**: 2026-06-15
*   **Problem**: High concurrent search queries degrade Gunicorn web server write-path performance.
*   **Decision**: Decouple database reads. Django Gunicorn handles mutations; Go API microservice handles search and event streams using Meilisearch.

## ADR 2: Transactional Outbox Pattern
*   **Date**: 2026-06-15
*   **Problem**: Direct search index updates inside views result in dirty reads if database transactions roll back.
*   **Decision**: Write index syncing tasks to an `OutboxTask` database table inside active database transactions, executing synchronization asynchronously.

## ADR 3: Outbox Payload Cryptographic Hashing
*   **Date**: 2026-07-19
*   **Problem**: Danger of database payload modifications or SQL injections executing malicious tasks.
*   **Decision**: Sign outbox payloads with a SHA-256 HMAC signature at creation, validating it when the outbox processor runs.

## ADR 4: Security Headers & Request Limits
*   **Date**: 2026-07-22
*   **Problem**: Missing security headers and request size limits expose the Go API to potential attacks (MIME sniffing, clickjacking, DoS via oversized payloads).
*   **Decision**: Implement production-standard security headers middleware (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`) and enforce 10MB request body size limit. Apply server timeouts (ReadHeader: 10s, Read: 30s, Write: 30s, Idle: 120s).

## ADR 5: Redis Persistence & Resource Limits
*   **Date**: 2026-07-22
*   **Problem**: Redis uses default RDB persistence only, risking data loss on crash. Docker services lack resource limits, risking OOM kills and resource starvation.
*   **Decision**: Enable Redis AOF persistence with `appendfsync everysec` for durability. Add Docker resource limits (memory and CPU) to all services to prevent resource exhaustion. Add Redis maxmemory limit (256MB) with LRU eviction policy.
