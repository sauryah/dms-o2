# DMS Architecture Migration Plan

This migration plan outlines the detailed, step-by-step refactoring plan to transition the Die Management System (DMS) codebase into a clean, secure, structured, and performant enterprise-grade application.

No source code modifications will be executed until this plan receives explicit approval.

---

## 🛠️ Phase-by-Phase File Modification Ledger

### PHASE 1 — Go API Refactor

The Go API is currently a single monolithic file (`go-api/main.go`) managing all concerns. We will partition it into clean packages:
- `cmd/server/main.go`: Server bootstrap.
- `internal/config/`: Configuration mapping.
- `internal/auth/`: JWT verification.
- `internal/database/`: Postgres connections and queries.
- `internal/cache/`: Redis cache mapping and invalidation.
- `internal/search/`: Meilisearch search integrations.
- `internal/events/`: SSE connections and broadcast events.
- `internal/handlers/`: Route controllers.

| File Path | Action | Reason |
| :--- | :--- | :--- |
| `go-api/main.go` | **Delete** | Reposition logic into dedicated packages; remove monolithic structure. |
| `go-api/cmd/server/main.go` | **Create** | Entry point of the microservice; initializes configuration and triggers service bootstrapping. |
| `go-api/internal/config/config.go` | **Create** | Parses and validates environment configurations into a central `Config` struct. |
| `go-api/internal/auth/auth.go` | **Create** | Houses JWT parsing and token verification middleware to protect API endpoints. |
| `go-api/internal/database/database.go`| **Create** | Abstracts Postgres connections and encapsulates database queries in a `DieRepository` structure. |
| `go-api/internal/cache/cache.go` | **Create** | Encapsulates Redis querying, data caching, and scan-delete invalidation logic. |
| `go-api/internal/search/search.go` | **Create** | Contains Meilisearch client initialization and search parameters builder logic. |
| `go-api/internal/events/events.go` | **Create** | Implements the Server-Sent Events (SSE) `EventManager` and connection pool mapping. |
| `go-api/internal/handlers/handlers.go` | **Create** | HTTP route controllers for search query handling, health checks, event streams, and statistics. |
| `go-api/Dockerfile` | **Modify** | Adjust build command from `go build -o server main.go` to `go build -o server cmd/server/main.go`. |

---

### PHASE 2 — Security Fixes

Secure the Go search routing endpoint and remove hardcoded API secrets fallback values.

| File Path | Action | Reason |
| :--- | :--- | :--- |
| `go-api/internal/auth/auth.go` | **Modify** | Remove guest authentication fallback (`tokenStr == ""`) from middleware; strictly enforce validation and return `401 Unauthorized` for protected endpoints. |
| `go-api/internal/config/config.go` | **Modify** | Eliminate hardcoded string values for `DJANGO_SECRET_KEY` and `MEILI_MASTER_KEY`; raise fatal errors if vital variables are missing on startup. |

---

### PHASE 3 — Configuration Cleanup

Introduce configuration decoupling in Go API.

| File Path | Action | Reason |
| :--- | :--- | :--- |
| `go-api/internal/config/config.go` | **Modify** | Expose a unified `LoadConfig` loader resolving environment keys to structured variables. |
| `go-api/internal/database/database.go`| **Modify** | Replace duplicated raw postgres socket strings in connection and listener logic with injected parameters from `Config`. |

---

### PHASE 4 — Django Backend Cleanup

Separate Django view logic, Excel importing rules, and search integrations into modular service modules.

| File Path | Action | Reason |
| :--- | :--- | :--- |
| `backend/dies/import.py` | **Delete** | Reposition heavy business validation and spreadsheet parsing logic into separate services. |
| `backend/dies/services/__init__.py` | **Create** | Module initializer. |
| `backend/dies/services/import_service.py`| **Create** | Encapsulates the execution logic for parsing CSV/Excel spreadsheets, executing bulk updates, and managing database savepoint transactions. |
| `backend/dies/services/validation_service.py`| **Create** | Validates uploaded rows, checking correct dimension parameters and casing rules. |
| `backend/dies/services/search_service.py`| **Create** | Manages Django-to-Meilisearch document synchronizations and cache invalidation commands. |
| `backend/dies/views.py` | **Modify** | Update import trigger handler views to delegate to `ImportService`. |
| `backend/dies/signals.py` | **Modify** | Refactor database saving triggers to delegate Meilisearch synchronization to `SearchService`. |

---

### PHASE 5 — Background Processing

Optimize Celery background processing to support batch operations.

| File Path | Action | Reason |
| :--- | :--- | :--- |
| `backend/search/tasks.py` | **Modify** | Add a batch-sync task processing multiple IDs in a single Meilisearch API call, reducing API queue overhead. |
| `backend/dies/services/import_service.py`| **Modify** | Trigger batch sync Celery tasks instead of queuing multiple single tasks. |

---

### PHASE 6 — Frontend Organization

Reorganize the flat frontend React components structure into domain-driven features.

| File Path | Action | Reason |
| :--- | :--- | :--- |
| `frontend/src/features/inventory/components/` | **Create** | Folder containing inventory-specific UI modules (e.g. `DiesTable.tsx`, `RackLayoutGrid.tsx`). |
| `frontend/src/features/inventory/hooks/` | **Create** | Directory hosting inventory page specific logic hooks. |
| `frontend/src/features/dashboard/components/` | **Create** | Folder containing dashboard components (e.g., `RoundDieCard.tsx`, `FlatDieCard.tsx`). |
| `frontend/src/features/dashboard/hooks/` | **Create** | Directory hosting dashboard statistics hooks. |
| `frontend/src/components/` | **Modify** | Relocate specific components to corresponding feature domains; keep shared UI components (e.g. `Navbar.tsx`, `ErrorBoundary.tsx`) in `src/components/`. |
| `frontend/src/hooks/useDies.ts` | **Delete** | Split into feature-specific hook files under respective domain hooks. |
| `frontend/src/App.tsx` | **Modify** | Adjust routing import links referencing relocated pages. |

---

### PHASE 7 — Logging + Error Handling

Incorporate structured logging and standard API errors.

| File Path | Action | Reason |
| :--- | :--- | :--- |
| `go-api/internal/handlers/handlers.go` | **Modify** | Replace raw logs with Go `log/slog` structured JSON logs, formatting standard RFC 7807 problem details in responses. |
| `backend/dies/services/import_service.py`| **Modify** | Eliminate generic exception swallowing, capturing specific database exceptions and logging full traceback logs. |

---

### PHASE 8 — Tests

Introduce microservice tests and verify existing backend integration tests.

| File Path | Action | Reason |
| :--- | :--- | :--- |
| `go-api/internal/handlers/handlers_test.go`| **Create** | Unit tests for Go Search handlers using net/http/httptest mocks. |
| `backend/dies/tests/test_services.py` | **Create** | Unit tests verifying `ImportService` and `ValidationService` assertions. |

---

## 🚦 Verification Strategy (Run after each phase)
1. **Docker Compose Rebuild**: `docker compose up --build -d`
2. **Backend Unit Tests**: `docker compose exec django python manage.py test`
3. **Frontend Unit Tests**: `docker compose exec frontend npm run test`
4. **E2E Playwright Tests**: `npm run test:e2e` (on host)
5. **Logs Verification**: Check docker compose logs for connection errors.
