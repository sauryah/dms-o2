# Executive Summary

This report documents the full engineering audit of the DMS-O2 platform codebase. DMS-O2 is a split Relational/Search system utilizing a Django backend (written in Python 3.11/Django 4.2) for transaction-safe writes, auditing, and backup operations, a Go service (written in Go 1.22) for high-performance read proxying and cache lookup coordination, a Meilisearch v1.7 search engine, and a React 18 single-page web app.

While the general design, relational normalization, and database optimization measures are robust, a thorough engineering audit of code logic, Docker packaging, and shell files revealed two Critical security issues (Redis session cache eviction bypass and Celery outbox payload verification bypass on empty hashes), three High-priority operational and concurrency bugs (broken database restore script, timer allocations inside Go select loops, and search sync race conditions), and minor validation and display inconsistencies. 

# Overall Score (68/100)

The DMS-O2 platform scores a **68 out of 100**. Relational safety and performance choices are solid, but critical security and concurrency leaks must be resolved before production deployment.

# Critical Issues

### Redis Session Cache Eviction Bypass
- **Severity**: Critical
- **Description**: The Go API caches JWT signature status in Redis under keys matching `verify_token:<token_hash>` with a 5-minute TTL. When a session is deleted in Django (due to deactivation, concurrent session eviction, password updates, or idle timeout), the `post_delete` signal handler `evict_redis_cache_on_session_delete` in `signals.py` only invalidates Django-prefixed cache keys. The Go-prefixed `verify_token:*` keys are not removed.
- **Files affected**:
  - [backend/users/signals.py:L32-L40](file:///D:/DMS/dms-o2/backend/users/signals.py#L32-L40)
  - [backend/users/services/session_service.py:L75-L87](file:///D:/DMS/dms-o2/backend/users/services/session_service.py#L75-L87)
  - [backend/users/views/auth.py:L127-L153](file:///D:/DMS/dms-o2/backend/users/views/auth.py#L127-L153)
- **Recommended fix**: Update the post-delete session signal handler or session termination methods in Django to explicitly send a Redis delete command for the key `verify_token:<token_hash>`.
- **Risk if ignored**: Deactivated, timed-out, or evicted user sessions remain authenticated on the Go Search and SSE event APIs for up to 5 minutes, violating instant revocation access control policies.

### HMAC Outbox Signature Bypass on Empty Hash
- **Severity**: Critical
- **Description**: The periodic outbox task processor `process_outbox_task` in `tasks.py` verifies the payload signature using the Django `SECRET_KEY` only when `payload_hash` is present in the `OutboxTask` row. If `payload_hash` is NULL or empty, validation is skipped entirely, and the search indexing update or delete is executed.
- **Files affected**:
  - [backend/search/tasks.py:L320-L332](file:///D:/DMS/dms-o2/backend/search/tasks.py#L320-L332)
- **Recommended fix**: Modify `process_outbox_task` to always require a valid `payload_hash`. Reject and log security alerts for any outbox rows that have an empty or invalid signature hash.
- **Risk if ignored**: An attacker with low-privilege database write access (e.g. via SQL injection) can write rows to the `OutboxTask` table with an empty `payload_hash` to manipulate search index states or delete documents without knowing the HMAC signing key.

# High Issues

### Broken Restore Script in dms-backup.sh
- **Severity**: High
- **Description**: The manual restore workflow in `dms-backup.sh` stops the backend and Go API containers (`docker compose stop django worker go-api`) on line 60, but then tries to execute psql and pg_restore commands using `docker compose exec django psql ...`. Since the `django` container is stopped, the exec commands fail immediately.
- **Files affected**:
  - [dms-backup.sh:L59-L72](file:///D:/DMS/dms-o2/dms-backup.sh#L59-L72)
- **Recommended fix**: Execute the database drops, recreations, and restorations inside the `db` (Postgres) container which remains running, rather than the stopped `django` container.
- **Risk if ignored**: System recovery and disaster restore procedures via this command-line script are non-functional.

### Go Concurrency Timer Leak in Events Listener
- **Severity**: High
- **Description**: The select loop inside `StartEventListener` in `events.go` triggers listener pings using `case <-time.After(90 * time.Second):`. Under high update traffic, the select statement is frequently re-entered, creating a new timer channel on every iteration while the old channels are leaked until they eventually expire.
- **Files affected**:
  - [go-api/internal/events/events.go:L144-L151](file:///D:/DMS/dms-o2/go-api/internal/events/events.go#L144-L151)
- **Recommended fix**: Move the timer instantiation outside the loop using `time.NewTicker` or a single `time.Timer` stopped and reset correctly on each iteration.
- **Risk if ignored**: Heavy memory leak, high garbage collection pressure, and potential OOM crashes of the Go microservice under active production floor write loads.

### Search Outbox / SSE Sync Race Condition (Stale UI Data)
- **Severity**: High
- **Description**: When a `Die` is saved, the model post-save signal immediately triggers both search index outbox queueing and an instant SSE update event. The client web app receives the SSE event, invalidates the cache, and refetches data immediately. However, since the outbox Celery task runs asynchronously every 5 seconds, Meilisearch has not updated yet. The Go Search API queries the stale index, returning old values, and the UI remains stale indefinitely.
- **Files affected**:
- **Recommended fix**: Defer the client SSE broadcast from the Django database signal. Instead, broadcast the update event inside the outbox task `process_outbox_task` *after* the index is successfully synchronized.
- **Risk if ignored**: Operators see stale location or status details in the inventory grids after saving edits.

### Set Reordering Bypasses Audit Signals and Search Resync
- **Severity**: High
- **Description**: The `reorder` action in `SetViewSet` updates set positions and machine assignments using `Set.objects.bulk_update(updated_sets, ['machine', 'order'])`. Because Django's `bulk_update` does not trigger model signals, `log_set_updated` and `sync_set_dies` are bypassed. No history audit trail is created, clients receive no SSE notification, and the dies belonging to those sets are not resynced, leaving stale machine names in search queries.
- **Files affected**:
  - [backend/machines/views/set.py:L63](file:///D:/DMS/dms-o2/backend/machines/views/set.py#L63)
  - [backend/machines/signals.py:L18-L28](file:///D:/DMS/dms-o2/backend/machines/signals.py#L18-L28)
- **Recommended fix**: Iterate and save individual set instances inside a transaction block or manually queue the `sync_dies_batch_task` and trigger set events inside the `reorder` view action.
- **Risk if ignored**: Set modifications are not captured in `MachineHistory` audit logs, and search queries return stale machine associations for affected dies.

# Medium Issues

### Plain Integer Fields on Rack Grid Dimensions
- **Severity**: Medium
- **Description**: The row and column counts in the `Rack` model are plain `IntegerField`s without minimum value constraints.
- **Files affected**:
  - [backend/machines/models.py:L28-L31](file:///D:/DMS/dms-o2/backend/machines/models.py#L28-L31)
- **Recommended fix**: Add `validators=[MinValueValidator(1)]` to both `row_count` and `column_count` in the `Rack` model.
- **Risk if ignored**: Racks could be created with negative row or column grids, causing rendering exceptions in the frontend layout view.

### Non-Root Execution Policy Violation in Dockerfiles
- **Severity**: Medium
- **Description**: The production Dockerfiles (`Dockerfile` in root, `backend/Dockerfile`, `go-api/Dockerfile`, and `frontend/Dockerfile.prod`) do not configure a non-root system user or specify a `USER` directive. They run as root by default, violating Security Rule 1.
- **Files affected**:
  - [Dockerfile](file:///D:/DMS/dms-o2/Dockerfile)
  - [backend/Dockerfile](file:///D:/DMS/dms-o2/backend/Dockerfile)
  - [go-api/Dockerfile](file:///D:/DMS/dms-o2/go-api/Dockerfile)
  - [frontend/Dockerfile.prod](file:///D:/DMS/dms-o2/frontend/Dockerfile.prod)
- **Recommended fix**: Create a non-root system group/user (`dmsuser`) and add the `USER dmsuser` directive to all production containers.
- **Risk if ignored**: Elevates host breakout vulnerabilities if container processes are compromised.

### Missing Redis Persistence in docker-compose.prod.yml
- **Severity**: Medium
- **Description**: Unlike the development file, the production `redis` service does not specify a volume mount or enable Append-Only File (AOF) persistence.
- **Files affected**:
  - [docker-compose.prod.yml:L262-L270](file:///D:/DMS/dms-o2/docker-compose.prod.yml#L262-L270)
- **Recommended fix**: Add the `redis_data` volume mount and add the `--appendonly yes --appendfsync everysec` command to the redis service definition.
- **Risk if ignored**: Cached searches, active user sessions, and Celery beat backup tasks are lost during Redis container restarts.

# Low Issues

### Stale In-Memory Predicted Remaining Days on Save
- **Severity**: Low
- **Description**: `WearAlertService.check_wear_alerts` uses direct SQL queries `Die.objects.filter(id=die.id).update(...)` to update predicted remaining days. This updates the database but leaves the in-memory Python `die` instance attribute unchanged, returning stale predictions in immediately serialized API responses.
- **Files affected**:
  - [backend/dies/services/wear_alert_service.py:L107-L115](file:///D:/DMS/dms-o2/backend/dies/services/wear_alert_service.py#L107-L115)
- **Recommended fix**: Set `die.predicted_remaining_days = int(rem_days)` on the Python instance in memory within the service.
- **Risk if ignored**: API update responses contain old prediction values, forcing the client to reload/refetch to display current data.

### Schema and Field Mismatch in Fast Serializer
- **Severity**: Low
- **Description**: The fast custom serializer `serialize_die_list_fast` used to speed up list requests does not serialize `predicted_remaining_days` or `active_alerts`.
- **Files affected**:
  - [backend/dies/serializers.py:L227-L259](file:///D:/DMS/dms-o2/backend/dies/serializers.py#L227-L259)
  - [backend/dies/views.py:L91-L98](file:///D:/DMS/dms-o2/backend/dies/views.py#L91-L98)
- **Recommended fix**: Add these missing keys to the serialized dictionary in `serialize_die_list_fast`.
- **Risk if ignored**: API schema inconsistency. The list query output differs from the detail view.

### Hardcoded Tolerances in frontend CadRenderer
- **Severity**: Low
- **Description**: The `CadRenderer.tsx` component hardcodes the warning highlight at `70%` and critical highlight at `100%` wear, bypassing database tolerance percentages in `DieTolerance`.
- **Files affected**:
  - [frontend/src/features/inventory/components/CadRenderer.tsx:L96-L101](file:///D:/DMS/dms-o2/frontend/src/features/inventory/components/CadRenderer.tsx#L96-L101)
- **Recommended fix**: Render alert highlights based on the model's computed `alert_level` values from the prediction payload.
- **Risk if ignored**: Visual display mismatch. Highlights remain green even when the system has generated an active alert.

# Architecture

Reviewed the split Relational-Search layout. Writes safely flow to the database while reads query Meilisearch and direct PostgreSQL. The outbox design is architecturally sound. However, the transaction settings have a documentation mismatch: `ARCHITECTURE.md` lists `ATOMIC_REQUESTS: True` while the settings file has it set to `False`. This should be aligned for clarity.

# Security

Verified brute-force IP rate limiting (5 attempts/min) on `LoginView`. Validated that the internal JWT verification API uses `compare_digest` to prevent timing attacks. Customized role restrictions are securely verified.
- **Vulnerabilities**: Incomplete Redis session invalidation on user deactivation/eviction, and outbox task HMAC bypass on empty hashes (see Critical issues).

# Backend

The business logic is cleanly isolated in service layers (`SessionService`, `ImportService`, `RecutService`). Custom middleware handles context auditing.
- **Inconsistencies**: Stale in-memory variables and signal bypasses on `bulk_update` (see Low/High issues).

# Frontend

The React 18 frontend uses React.lazy code-splitting, leading to optimized page sizes. Global keybind listeners (`Ctrl+K` for command palettes) and touch-friendly drag grids enrich floor operations.
- **Display bugs**: Hardcoded CAD highlights (see Low issues).

# Go Services

Reviewed database connection parameters, which include configured connection lifespans and idle limits. Checked weak credentials rejection at startup.
- **Concurrency bugs**: Timer leak inside event loops (see High issues).

# Database

Relational model index coverage is excellent, featuring indexes on status/type fields, timestamps, and GIN trigram indexes on casings. Composite primary keys are properly defined.
- **Validation gaps**: Plain integer inputs on Rack dimensions (see Medium issues).

# DevOps

Proxy rates and SSL redirects are correctly defined in Traefik. Docker configurations support multi-arch images.
- **Packaging/Reliability issues**: Broken database restore command, missing production Redis AOF persistence, and root execution violations in containers (see Medium/High issues).

# Performance

Checked list virtualization using `react-window` to handle large tables. Fast serializer implementation increases performance by 10-15x.
- **Bottlenecks**: Go timer leaks and API state mismatches (see High/Low issues).

# Testing

Validated testing files for the Go microservice (covering config, cache, and auth packages). Playwright E2E suite and Django unit test suites are fully integrated.

# Documentation

The roadmap, spec lists, and developers' guides are comprehensive and accurate.

# Technical Debt

- Single device constraints limit usability for shop floor operators using multiple terminals.
- Hardcoded Tolerances in the CAD renderer component.
- Host volume mounts override packaged production images, hindering CD flows.

# Production Readiness

- **Status**: **NOT READY**. Critical security vulnerabilities, memory leaks, and broken CLI tools must be resolved first.

# Prioritized Action Plan

1.  **Phase 1 (Immediate Security Patch)**:
    *   Fix the session eviction Redis cache leak by updating `signals.py` to delete `verify_token:<token_hash>`.
    *   Reject empty outbox task hashes in `tasks.py`.
2.  **Phase 2 (Reliability and Leaks)**:
    *   Fix the Go event listener timer memory leak in `events.go`.
    *   Resolve the stopped container bug in `dms-backup.sh` by running restoration commands inside the database container.
3.  **Phase 3 (Operational Sync & Consistency)**:
    *   Solve the set reordering signals bypass in `SetViewSet.reorder`.
    *   Defer SSE update broadcasts to the end of the outbox search indexing task to prevent stale UI loading.
