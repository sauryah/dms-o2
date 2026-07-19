# Architectural Decisions Log (DECISION_LOG.md)

This log records the core design decisions made for the DMS-O2 codebase.

---

## 1. Double-Buffered Search Pipeline
*   **Decision**: Offload fuzzy search read-path queries to the Go Search API (interfaced with Meilisearch and Postgres) while keeping Django as the system of record.
*   **Rationale**: Offloading Meilisearch queries and read pagination to Go keeps response times sub-50ms (and sub-5ms when cached), shielding Django from high-frequency read queries.
*   **Trade-off**: Requires token validation proxying and cross-service cache invalidation hooks.

---

## 2. Transactional Outbox Pattern for Search Syncing
*   **Decision**: Signals write Meilisearch sync events to a database table (`OutboxTask`) first, and then fire background indexing via Celery `on_commit`.
*   **Rationale**: Prevents external API calls (to Meilisearch) inside Django request threads, avoiding connection locks and database rollback synchronization issues. If a batch indexing fails, tasks are retried in small individual chunks.

---

## 3. Preservation of Restorer Session during DB Restore
*   **Decision**: Capture active session metadata (token hash, IP, user-agent) before executing `pg_restore` and recreate it post-restoration.
*   **Rationale**: Restoring a database drops the current user sessions tables, immediately logging out the restorer and causing restore verification loops to crash.
*   **Trade-off**: Requires clean session state pruning of other restored sessions to prevent token hijacking.

---

## 4. CSRF Protection for state-changing cookie authenticated requests
*   **Decision**: Cookie-authenticated API requests (PATCH, POST, DELETE) are rejected unless they provide the custom request header `X-Requested-With: XMLHttpRequest`.
*   **Rationale**: Prevents Cross-Site Request Forgery (CSRF) on HTTPOnly token cookie sessions by forcing the browser to prove the request originated from an authorized AJAX call.

---

## 5. Timing-safe Internal Token Verification
*   **Decision**: The internal communication endpoint `/internal/verify-token/` compares the header `X-Internal-Key` with the secret key using `hmac.compare_digest`.
*   **Rationale**: Mitigates timing attacks where attackers could measure character comparison response times to brute-force the internal API secret key.

---

## 6. Unified Monolithic Container packaging
*   **Decision**: Package Gunicorn, Celery, Go API, Nginx, and static web assets into a single Docker image managed by Supervisord.
*   **Rationale**: Simplifies deployment down to a single container running in production, providing local Nginx proxy redirects and simple container updates.
*   **Trade-off**: Multi-stage compilation files increase build times.

---

## 7. GIN Trigram indexes on Postgres fallbacks
*   **Decision**: Enforced `GinIndex(fields=['location'], opclasses=['gin_trgm_ops'])` on location and casing models.
*   **Rationale**: Ensures Postgres fallback query matching remains fast when Meilisearch is rebuilding or offline.
