# Production Refactoring Report

**Date:** June 2026
**Scope:** Backend `dies` and `users` applications

## Priority Ranking
* **High:** Architecture, Security
* **Medium:** Maintainability, Code Smells
* **Low:** Performance, Testing Gaps

## 1. Architecture Issues
* **God Objects & Tight Coupling:** The `import_dies` method in `backend/dies/services/import_service.py` was acting as a God method. It was handling file parsing, data validation, object lookup/resolution, and database mutations within a massive transaction block.
  * **Solution:** Extracted logic into `_parse_file`, `_resolve_set`, and `_process_row` helper methods.
* **Separation of Concerns:** `backend/users/views.py` contained raw `os` operations, system `subprocess` calls (`pg_dump`, `pg_restore`), and environment variables hacking directly inside the view methods.
  * **Solution:** Extracted filesystem and subprocess logic into a dedicated `BackupService` (`backend/users/services/backup_service.py`). The view now strictly acts as an HTTP interface, delegating the logic to the service layer.

## 2. Security Issues
* **Path Traversal Vulnerability:** The `validate_filepath` logic for backups used a weak `.startswith()` string check, which is vulnerable to basic traversal attacks.
  * **Solution:** Replaced with `os.path.realpath` and `os.path.commonpath` to ensure the backup file strongly resolves inside the target directory.
* **Information Exposure:** The backup endpoints previously lacked strict validation over `stderr` during `subprocess` exceptions.
  * **Solution:** Handled safely in the `BackupService` with precise Exception messages propagating standard errors without leaking environment state.

## 3. Maintainability & Code Smells
* **Deep Nesting:** The `import_dies` script possessed 5 levels of try/except nesting, rendering it difficult to trace code flow.
  * **Solution:** Helper abstractions greatly flattened the control flow.
* **Duplication:** Backup directory checking logic (`if not os.path.exists(backup_dir)`) was duplicated across several view methods.
  * **Solution:** Centralized within `BackupService`.

## 4. Performance Issues
* **Redundant Iterations:** The backup pruner used `os.listdir()` and individual `os.stat` repeatedly.
  * **Mitigation:** Abstracted to `BackupService.prune_old_backups` to clean up efficiently and safely.
* *Note:* Future refactors should review how Meilisearch index syncing queues Celery tasks, as bulk syncing might overflow the Redis broker under heavy load.

## 5. Testing Gaps
* The current test suite strongly couples to an available PostgreSQL and Meilisearch daemon. Tests instantly crash with `OperationalError` when the database daemon is unavailable.
  * **Recommendation:** Mock the database/meili interactions in unit tests to allow testing of business logic independently, or segregate unit tests and integration tests cleanly.

## 6. Suggested Future Refactors
* **Frontend State Management:** The frontend `InventoryPage.tsx` is over 1,500 lines long. It should be aggressively decomposed into smaller layout and filter components.
* **Django Middleware Abstractions:** Migrate the concurrent session tracking out of `users.middleware` and `users.views` explicitly into an auth-specific service.

## 7. Estimated Maintenance Impact
* **Impact:** High. By enforcing separation of concerns across the service boundaries, bug fixing and unit testing the import and backup layers are now far simpler.

## 8. Stabilization Refactoring (June 30, 2026)
* **Resolved Privilege Escalation Vulnerability:** Secured role updates in `UserSerializer` to block non-ROOT users from altering user roles. Added ROOT self-demotion and self-deactivation safeguards to avoid superuser lockout states.
* **Resolved Backup Download/Delete NameErrors:** Corrected `delete_backup` and `download_backup` view methods in `users/views.py` to define the local variable `filepath` and return standard 404 responses for missing dump files.
* **Pruned Machine History Table:** Added database maintenance commands in `prune_history.sh` targeting the `history_machinehistory` table to resolve long-term Postgres storage leakage.
* **Optimized Fuzzy Search Database Load:** Refactored Go search endpoint to avoid executing parallel wildcard queries against Postgres if Meilisearch returns results successfully, setting up Postgres direct wildcard query as a fallback-only mechanism.
* **Go Database Connection Hardening:** Configured `SetConnMaxLifetime` and `SetConnMaxIdleTime` connection limits in the Go database pool to eliminate stale DB connection resets.
* **Resolved Test Suite Transaction Errors:** Turned off global `ATOMIC_REQUESTS` in Django `settings.py` to allow exception responses (400, 401, 403) to return without contaminating testing transactions, while adding selective transaction wrapping decorators (`@transaction.atomic`) on `DieCreateSerializer` creation and update flows.
* **Improved Virtualized Accessibility:** Spread the `ariaAttributes` object from the list virtualizer down to the rows inside `DiesTable.tsx` for full screen reader compliance.

## 9. Architecture & Security Hardening (July 17, 2026)

### 9.1 Thread-Locals to Contextvars Migration
* **Problem:** The original `threading.local()` pattern in `users/context.py` is not safe for async/ASGI deployments and creates implicit coupling between middleware, signals, and import services.
* **Solution:** Replaced `threading.local()` with `contextvars.ContextVar` instances (`_current_user_var`, `_current_ip_var`, `_skip_single_sync_var`, `_pending_sync_die_ids_var`, `_pending_broadcast_keys_var`). A backward-compatible `_ThreadLocalsProxy` class exposes property accessors so existing `from users.context import _thread_locals` imports continue to work. The `CurrentUserMiddleware` now writes directly to contextvars on entry and clears them on exit.

### 9.2 View-to-Service Extraction
* **Problem:** `dies/views.py` contained ~200 lines of recut and wear prediction business logic inline, mixing HTTP concerns with domain logic.
* **Solution:** Extracted `RecutService.recut_die()` into `backend/dies/services/recut_service.py` and `WearPredictionService.calculate_wear_prediction()` into `backend/dies/services/wear_prediction_service.py`. The view methods now delegate to these services in 3-5 lines each, improving testability and separation of concerns.

### 9.3 Session Service Extraction
* **Problem:** `users/authentication.py` contained session lookup, timeout validation, and last-seen update logic interleaved with JWT parsing, creating a monolithic authentication handler.
* **Solution:** Extracted all session lifecycle operations into `backend/users/services/session_service.py` (`SessionService.get_session_data()`, `SessionService.check_timeouts()`, `SessionService.update_last_seen()`). The `CustomJWTAuthentication.authenticate()` method now calls these static methods, reducing the file from ~150 lines to ~46 lines.

### 9.4 Go API SearchParams Refactoring
* **Problem:** The `HandleSearch` function in `go-api/internal/handlers/handlers.go` parsed 15+ query parameters with repeated `r.URL.Query().Get()` calls, and computed die scores twice per element during sorting.
* **Solution:** Introduced a `SearchParams` struct with a `ParseFromURL(r *http.Request)` method. All filter parameters are now accessed via `params.FieldName`. Pre-computed scores using a `scoredDie` slice avoid the double `scoreDie()` call per sort element, cutting the search hot path computation roughly in half.

### 9.5 Meilisearch Filter Injection Fix
* **Problem:** User-supplied filter values (e.g., `size_min`, `casing`) were embedded directly into Meilisearch filter expressions without escaping. A malicious `casing` value containing a single quote could break the filter syntax or inject unintended filter clauses.
* **Solution:** Added `escapeMeiliFilterValue()` that escapes backslashes (`\` → `\\`), single quotes (`'` → `\'`), and control characters (`\x00`-`\x1f`) before string interpolation. `QueryMeilisearchAndPostgres` now accepts `*SearchParams` to ensure all filter values pass through the sanitizer.

### 9.6 Frontend SSE Selective Invalidation
* **Problem:** The `useEffect` SSE handler in `App.tsx` called `queryClient.invalidateQueries()` (no arguments) on every event, forcing all React Query caches to refetch regardless of event type.
* **Solution:** Extracted the handler into `useRealtimeSync` custom hook with an `EVENT_QUERY_KEYS` map. A `die_update` event now only invalidates `['dies']`, `['search']`, and `['stats']` queries; a `set_update` event only invalidates `['sets']` and `['machines']`, etc. This reduces unnecessary network requests and improves UI responsiveness.

### 9.7 Docker Compose Production Hardening
* **Problem:** The Django service ran `python manage.py runserver` (development-only server) even in production Docker deployments. The `backup` container had no health check. Environment variables were duplicated across multiple service definitions.
* **Solution:** Replaced `runserver` with `gunicorn dms.wsgi:application --bind 0.0.0.0:8000 --workers 3 --reload`. Added `pgrep -x crond` health check to the backup service. Introduced `x-common-env` YAML anchor to deduplicate shared environment variables across `migrate`, `django`, and `worker` services.

### 9.8 Production Secret Validation
* **Problem:** Default or weak secrets (e.g., `dms_internal_secret_default_key_998`) could silently pass into production deployments without triggering any warnings.
* **Solution:** Added startup validation in `settings.py` that raises `ImproperlyConfigured` if `DJANGO_DEBUG=False` and any of `SECRET_KEY`, `MEILI_MASTER_KEY`, `INTERNAL_API_SECRET`, or `POSTGRES_PASSWORD` match known weak defaults or are shorter than 16 characters.
