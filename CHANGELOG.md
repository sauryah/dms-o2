# Changelog

All notable changes to the DMS project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.8.0] - 2026-07-19

### Performance
- **Transactional Outbox Batch Writes Optimization**:
  - Refactored `SearchService.sync_dies_batch()` in `backend/dies/services/search_service.py` to use `bulk_create()` instead of sequential loops.
  - Pre-calculated and populated HMAC-SHA256 signatures inside Python before execution to maintain outbox payload integrity checks.
- **Gunicorn Production Process Tuning**:
  - Configured Gunicorn server command inside `supervisord.conf`, `docker-compose.ghcr.yml`, and `backend/Dockerfile` to run with 4 workers, 4 threads, and the `gthread` async worker class.
  - Aligned development `docker-compose.yml` configuration to utilize 3 workers and 2 threads running under `gthread` (retaining `--reload` file-monitoring checks).
- **Go Redis Client Connection Pooling**:
  - Configured connection pooling parameters (`PoolSize: 100`, `MinIdleConns: 10`, and socket timeouts) in `go-api/internal/cache/cache.go` to eliminate TCP handshake latencies during concurrent search volumes.
- **DieHistory Composite Index**:
  - Added composite index `(die, field_name, timestamp)` to `DieHistory` model in `backend/history/models.py`.
  - Generated and applied database schema migration to speed up query execution times inside the wear prediction engine.
- **Dashboard Search Cards Pagination**:
  - Implemented server-side pagination (24 cards per page matching 3-column layouts) for the main search results grid in `DashboardPage.tsx`.
  - Refactored `useSearchQuery` hook in `useDashboard.ts` to support the `offset` parameter and preserve JSON metadata (`total`, `limit`, `offset`) via `keepMetadata: true` options.

## [1.7.6] - 2026-07-17

### Security
- **Meilisearch Filter Injection Prevention**:
  - Added `escapeMeiliFilterValue()` in Go API to escape backslashes, single quotes, and control characters before embedding user input into Meilisearch filter expressions.
  - `QueryMeilisearchAndPostgres` now accepts a `*SearchParams` struct instead of raw strings, ensuring all user-supplied filter values pass through the sanitizer.
- **Production Secret Validation**:
  - Added startup validation in `settings.py` that rejects weak or default `INTERNAL_API_SECRET`, `DJANGO_SECRET_KEY`, `MEILI_MASTER_KEY`, and `POSTGRES_PASSWORD` values when `DJANGO_DEBUG=False`.
  - Added `INTERNAL_API_SECRET` to the Go API container environment (`docker-compose.yml`) and `.env.example` to ensure both services share a matching secret.

### Changed
- **Context Variables Replace Thread-Locals**:
  - Replaced `threading.local()` in `users/context.py` with a `contextvars`-based `_ThreadLocalsProxy` for async-safe request context (`current_user`, `current_ip`, `pending_sync_die_ids`, `pending_broadcast_keys`).
  - Updated `users/middleware.py`, `dies/signals.py`, `dies/services/import_service.py`, and `dies/services/search_service.py` to import from `users.context`.
- **Service Layer Extraction**:
  - Extracted `RecutService.recut_die()` into `backend/dies/services/recut_service.py`, removing ~80 lines of business logic from `dies/views.py`.
  - Extracted `WearPredictionService.calculate_wear_prediction()` into `backend/dies/services/wear_prediction_service.py`, removing ~120 lines from `dies/views.py`.
  - Extracted session validation, timeout checks, and last-seen updates into `backend/users/services/session_service.py` (`SessionService`), simplifying `users/authentication.py`.
- **Go API Search Refactoring**:
  - Introduced `SearchParams` struct with `ParseFromURL()` method in `go-api/internal/handlers/handlers.go`, replacing 15+ inline `r.URL.Query().Get()` calls.
  - Pre-computed die scores before sorting to avoid double `scoreDie()` calls per element during search result ranking.
- **Frontend Realtime Sync Hook**:
  - Extracted SSE event handling from `App.tsx` into a dedicated `useRealtimeSync` custom hook (`frontend/src/hooks/useRealtimeSync.ts`).
  - Implemented selective query invalidation: an `EVENT_QUERY_KEYS` map invalidates only relevant React Query caches per event type (`die_update` → `['dies','search','stats']`, etc.) instead of invalidating all queries.
- **Production WSGI Server**:
  - Replaced `python manage.py runserver` with `gunicorn dms.wsgi:application --bind 0.0.0.0:8000 --workers 3 --reload` in `docker-compose.yml` for the Django dev container.
- **Docker Compose Optimization**:
  - Introduced `x-common-env` YAML anchor in `docker-compose.yml` to deduplicate environment variables across `migrate`, `django`, and `worker` services.
  - Added `pgrep -x crond` health check to the `backup` container with a 30-second interval.
- **Session Architecture Cleanup**:
  - Removed redundant inline imports from `users/authentication.py`, consolidating all imports at module level.
  - The `CurrentUserMiddleware` now writes directly to contextvars instead of thread-locals, making it safe for async/ASGI deployments.

### Fixed
- **Go Build Compilation Error**:
  - Fixed undefined variable references (`sizeMin`, `sizeMax`, etc.) at `handlers.go:500` after the `SearchParams` refactoring — replaced bare variable names with `params.SizeMin`, `params.SizeMax`, etc.
- **TypeScript Type Mismatch**:
  - Fixed `useRealtimeSync` callback type signatures — `onShowToast` and `onAddNotification` now accept optional `"info" | "success" | "error"` union types instead of bare `string`.

### Added
- **Mocked Database Unit Tests**:
  - Added `backend/dies/tests/test_recut_service.py` with mocked ORM tests covering round die recut, flat die recut, permission checks, note validation, and size regression detection.
- **E2E Test for Wire Drawing Calculator**:
  - Added `frontend/tests/e2e/wire-drawing-calculator.spec.js` — basic Playwright E2E smoke test validating the calculator page loads and renders the input form.

### Deprecated
- **Thread-Locals Proxy (`thread_locals`)**:
  - The legacy `threading.local()` pattern in `users/context.py` is replaced by `contextvars.ContextVar` through the `_ThreadLocalsProxy` class. Direct `from users.context import _thread_locals` still works for backward compatibility but new code should use `get_current_user()` and `get_current_ip()` helpers.

---

## [Unreleased]

### Security
- **Redis Authentication**:
  - Added `REDIS_PASSWORD` environment variable with `--requirepass` on the Redis container.
  - Updated Go API, Django (Celery/CACHE), and all Redis clients to authenticate with the password.
- **SQL Injection Prevention**:
  - Added numeric validation for `$RETENTION_DAYS` in `scripts/prune_history.sh` before SQL interpolation.
- **Timing Attack Mitigation**:
  - Switched `INTERNAL_API_SECRET` comparison in `VerifyTokenView` to `hmac.compare_digest()`.
- **HTTP Security Headers**:
  - Added `X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`, `Referrer-Policy`, and `Content-Security-Policy` headers to nginx configuration.
- **Celery Token Safety**:
  - Backup restore tasks no longer serialize raw JWT tokens through the Celery broker; pre-computed token hashes are passed instead.
- **Docker Image Pinning**:
  - Pinned Go API Dockerfile base image from `alpine:latest` to `alpine:3.20` for reproducible builds.

### Changed
- **Health Check URL**:
  - Updated Docker healthcheck from `/api/health/` to `/api/v1/health/` for consistency with versioned API.
- **Meilisearch Document Mapping**:
  - Extracted shared `die_to_meili_document()` function in `search/tasks.py`, replacing 4 duplicated mapping blocks.

### Fixed
- **N+1 Query on Die List**:
  - Added `prefetch_related('wear_alerts')` to the die list queryset, eliminating per-die N+1 queries for active alerts.
- **Deploy Script Health Check**:
  - Fixed broken chained `grep` command in `deploy.sh` that caused health checks to always fail.
- **Dead Code Cleanup**:
  - Removed redundant `app.conf.imports` from `backend/dms/celery.py`.
  - Added `os.path.exists` guard in `backup_service.delete_backup()`.
- **ARIA Accessibility**:
  - Added `role`, `aria-expanded`, `aria-haspopup`, `aria-label` attributes to the `SearchableSelect` combobox component.
- **Documentation Consolidation**:
  - Replaced duplicate `wiki/Architecture.md` with a redirect to the canonical `docs/ARCHITECTURE.md`.

---

## [1.7.5] - 2026-07-17

### Added
- **Unified Chronological History Feed**:
  - Implemented `UnifiedHistoryListView` backend endpoint aggregating and sorting `DieHistory` and `MachineHistory` records.
  - Developed client-side transaction grouping logic that collapses consecutive changes made by the same user on the same entity (within a 5-second window) into a single timeline card.
  - Added inline visual green (additions), red (deletions), and blue (modifications) diff highlights.
- **Collapsible User Activity Logs**:
  - Added an inline "Logs" timeline panel within the user list of the `UserManager` console, allowing administrators to view user logins, failed attempts, and expires dynamically.
- **Granular Wear Prediction Restricting**:
  - Restricted frontend rendering of the `WearPredictionSection` inside the `DieDetailPage` to ROOT users or users explicitly granted `die-wear` tool permission.
  - Hardened backend REST access in `wear_prediction` action to validate user authorization permissions, returning a `403 Forbidden` error if unauthorized.

### Changed
- **Optimized Search Indexing Performance**:
  - Refactored `process_outbox_task` to batch Meilisearch document synchronization and deletions in chunks of 100, replacing single document updates with bulk batching for a 100x speedup.

### Fixed
- **Wire Drawing Calculator Math Toggle**:
  - Added a "Show Details" column toggle in the calculator results table to hide or reveal mathematical details columns (`Area Before`, `Area After`, and `Ratio`) on demand.
- **Precise Concurrent Session Eviction Alerts**:
  - Added short-term cache records tracking concurrent user session evictions in `LoginView` and `TokenRefreshView`.
  - Configured custom JWT authentication handler to raise structured 401 exceptions on evicted sessions, intercepted in the frontend to display an informative warning banner showing the evicting IP and time.

---

## [1.7.1] - 2026-07-16

### Added
- **Granular User Tool Authorization**:
  - Implemented backend role-based and tool-specific permissions using a new `authorized_tools` JSONField in the `User` model.
  - Developed granular frontend tool access controls, enabling or disabling access to specific tools (`sizing-calculator`, `wire-drawing-calculator`, `die-wear`, `draw-optimizer`) based on authorization state.
  - Enhanced the user management console (UserManager) with checkbox interfaces to allow administrators to assign specific tools to non-root users.
  - Enforced route-level guards in frontend routing (`ProtectedRoute`) to check user permissions before rendering pages.
- **Wire Drawing Fundamentals & Theory Panel**:
  - Integrated an interactive educational "Theory & Fundamentals of Wire Drawing" panel in the Wire Drawing Calculator.
  - Divided panel into three tabs: Mathematical Formulas (Area, Area Reduction, Elongation, and True Strain), Deformation Physics (Strain Hardening, Constant Volume, Force & Friction), and Best Practices/Limits (Pass Reduction Limits, Elongation Consistency, Semi-die Angle, and Delta Parameter).

### Changed
- **Unified Monolithic Deployment Structure**:
  - Introduced a multi-stage Docker build that compiles the React frontend and Go Search API, bundling them together with the Django WSGI backend, Celery worker, and Nginx reverse proxy into a single monolithic production image.
  - Created a simplified `docker-compose.unified.yml` setup which orchestrates the monolithic app container alongside PostgreSQL, Redis, and Meilisearch, significantly lowering hosting configuration complexity.
  - Configured Supervisord to manage Gunicorn, Celery, Go API, and Nginx processes in the unified container.
  - Updated the GitHub publish workflow (`docker-publish.yml`) to build and push a single unified image `dms-app` (and `app` on GHCR) rather than separate microservice images.

### Fixed
- **Results Table Usability**:
  - Added physical measurement units (`mm²`) to area column headers (`Area Bef (mm²)`, `Area Aft (mm²)`) in the results table.
  - Implemented a dedicated color-coded `reductionBadge` warning style for Area Reduction percentage to properly indicate compliance states distinct from elongation percentage.
- **Docker Build Exclusions**:
  - Adjusted `.dockerignore` rules to explicitly exclude `entrypoint.sh` from being ignored (via `!entrypoint.sh`), resolving container initialization failures.

---

## [1.7.0] - 2026-07-16

### Added
- **Wire Drawing Elongation Calculator**:
  - Integrated a new precision elongation calculator as an active workbench module.
  - Added area reduction bar charts and elongation bar charts utilizing `recharts`.
  - Added interactive results table with cell inline editing, insert die pass, and undo/redo capabilities.
  - Added automatic die size sequence suggester based on target elongation.
  - Added target check tolerances and pass consistency rating dashboard widget.
  - Added Excel (XLSX), CSV, PDF, and clipboard results exporting utilizing `xlsx`, `jspdf`, and `jspdf-autotable`.
  - Added client-side persistent schedule template savings in localStorage.
  - Added navigation shortcuts in global Navbar, Engineering Tools Suite hub, and Ctrl+K Command Palette search.

---

## [1.6.0] - 2026-07-12

### Changed
- **Documentation Updates**:
  - Replaced placeholder support emails with official project addresses.
  - Removed emoji headers from README to ensure robust anchor link navigation.
  - Fixed markdownlint list spacing in DOCKER.md.

## [1.5.0] - 2026-07-15

### Added
- **Wear Alert Engine & Configurable Tolerances**:
  - Implemented database-driven `DieTolerance` and `WearAlert` models to configure wear limits per die type.
  - Developed a background validation workflow running automatically via post-save Django signals to calculate reaming size expansion for Round dies and width/thickness expansion for Flat dies.
  - Exposed tolerance and alert configurations via new ViewSets and REST API endpoints (`/api/v1/tolerances/`, `/api/v1/wear-alerts/`).
  - Added nested `active_alerts` list details directly to `DieListSerializer` and `DieDetailSerializer`.
  - Added `WearAlertServiceTests` covering warning triggers, critical limits, escalation, and resolution.

### Fixed
- **Dashboard Navigation Sidebar Tree bug**:
  - Resolved structural tree selection bugs in `useInventoryState.ts` by checking search transitions using React `useRef`.
  - Enabled combined tree selection and search criteria by including `machine_id` and `set_id` filters in the Go API search compilation queries.

---

## [1.4.0] - 2026-07-10

### Added
- Standard community files: `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `SUPPORT.md`.
- Issue templates for bug reports and feature requests.
- Pull request template.
- Cookie-based JWT authentication fallback utilizing HTTPOnly cookies (`dms_access_token` and `dms_refresh_token`).
- Internal token verification security via `X-Internal-Key` and `INTERNAL_API_SECRET` checking between the Go search service and Django.
- Fallback unit test coverage for Go API handlers.

### Changed
- Replaced the proprietary license with the open-source MIT License.
- Updated absolute references in documentation to point to local workspace paths.
- Refactored `README.md`, `PROJECT.md`, `MASTER.md`, and `docs/ARCHITECTURE.md` to be concise, professional, and beginner-friendly.
- Refactored and decomposed the monolithic frontend `InventoryPage.tsx` into a custom state hook (`useInventoryState.ts`) and separate sub-components (`InventorySubViews.tsx`).
- Hardened token refresh logic to automatically sync active user sessions and clear outdated Redis cache keys.

### Fixed
- Stabilized and resolved all backend Django and frontend Vitest unit test failures.
- Fixed cookie cleanup during logout operations.


---

## [1.3.0] - 2026-06-30

### Fixed
- Fixed privilege escalation vulnerability in UserSerializer, blocking self-role updates for non-ROOT users.
- Prevented ROOT users from self-demoting or self-deactivating.
- Fixed NameError runtime crashes in BackupViewSet backup download and delete actions.
- Extended database pruning script prune_history.sh to prune the MachineHistory table.
- Optimized Go search microservice by avoiding parallel database direct query scans when Meilisearch is active (fallback-only).
- Configured connection maximum lifetime and idle connection limits in Go DB connection pool.
- Disabled Django global ATOMIC_REQUESTS to prevent test suite transaction contamination, and decorated serializer writes with explicit atomic transaction wrappers.
- Added aria attributes accessibility support to the DiesTable virtualized list rows.

---

## [1.2.0] - 2026-06-25

### Refactored
- Optimized Go API caching by replacing cursor-based `SCAN` keys iteration with a Redis Set (`cached_searches`) tracking list, reducing invalidation complexity.
- Secured Django `ImportService` thread-local variables (`user`, `skip_single_sync`) lifecycle management by wrapping the execution loop in a `try...finally` block.
- Modularized React frontend `UsersPage` into separate `UserManager` and `BackupManager` components.
- Modularized React frontend `MachineSetsPage` into separate `CategoriesTab`, `MachinesTab`, and `SetsTab` components.

---

## [1.1.0] - 2026-06-24

### Added
- Added custom `limit` parameter to Go API `/api/go/search` endpoint (default: 150).
- Configured frontend React Query prefetching to use `limit=10000` to fetch and render the complete tree.
- Implemented cache-first authentication lookups and throttled updates for `last_seen` in CustomJWTAuthentication.
- Enforced password strength validation in UserSerializer.
- Allowed self-profile updates for non-root users in IsRootOnly.
- Added client-side ProtectedRoute routing security.
- Developed an interactive HTML5 drag-and-drop Rack Grid Layout.
- Developed keyboard navigation support in the search dropdown (ArrowUp, ArrowDown, Enter).
- Added bidirectional CAD blueprint vector and specifications table highlighting.

---

## [1.0.0] - 2026-06-15

### Added
- High-performance Go search API microservice with custom Postgres ANY array parsing.
- Real-time status synchronization using PostgreSQL `LISTEN`/`NOTIFY` and Server-Sent Events (SSE).
- Automatic database backups nightly at 2:00 AM.
- Excel spreadsheet bulk imports.
- Concurrent user session eviction.
- Production deployment configuration with Traefik, Gunicorn, and Nginx.
