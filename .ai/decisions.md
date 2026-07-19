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
