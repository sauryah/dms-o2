# Codebase Conventions & Standards (CONVENTIONS.md)

This document maps repository conventions, directory layouts, coding style guidelines, testing procedures, dependencies policies, error formats, and logging protocols for the DMS-O2 codebase.

---

## 1. Directory Layout & File Placements
*   `/backend/dies`, `/backend/machines`, `/backend/history`, `/backend/users`: Core Django apps.
*   `/backend/search`: Helper python package for Meilisearch.
*   `/go-api/cmd`, `/go-api/internal`: Go Search microservice files.
*   `/frontend/src/features`, `/frontend/src/pages`: React component hierarchy.
*   `/frontend/src/hooks`: Global custom React hooks.
*   `/scripts`: Operations tooling scripts.

---

## 2. Git & Commit Messages Protocol

### 2.1 Commit Message Template
Commit messages must follow the Conventional Commits template:
```
<type>(<scope>): <short summary>

[Optional body explaining the 'why' behind this change]
```
Allowed Types:
*   `feat`: A new user-facing capability.
*   `fix`: A bug fix.
*   `refactor`: Code changes that do not alter public behavior.
*   `docs`: Documentation changes only.
*   `test`: Adding or correcting tests.
*   `chore`: Tooling, dependency, or configuration updates.

### 2.2 Git Quality Gate (`.githooks/pre-commit`)
Pre-commit checks verify staged files before commits can complete:
*   Runs `python3 -c "import py_compile; py_compile.compile(..., doraise=True)"` on all Python files.
*   Blocks commits containing direct `print()` or `console.log()` statements (unless bypassed using `# noqa` or `eslint-disable`).
*   Blocks `TODO/FIXME/HACK/XXX` comments unless a ticket link is provided (e.g., `# TODO(#123)`).
*   Blocks Docker files with empty `FROM` lines.
*   Scans files for credentials matching the regex pattern: `(password|secret_key|api_key|token)\s*=\s*["\x27][^"\x27]{8,}`.

---

## 3. Coding Standards & Guidelines

### 3.1 Python & Django
*   **Service Extraction**: Views must delegate to service classes. Keep business logic separate from HTTP requests (e.g., `ImportService`, `RecutService`, `WearAlertService`, `WearPredictionService`).
*   **Request Context**: Use `contextvars` proxy compatibility via `_thread_locals` (found in [context.py](file:///home/sahil/Desktop/Projects/dms-o2/backend/users/context.py)) to fetch the current user and IP address in signals and services.
*   **Signals**: Signal hooks (like [signals.py](file:///home/sahil/Desktop/Projects/dms-o2/backend/dies/signals.py)) must verify changed fields using `.values()` to optimize performance and prevent infinite loop recursion.
*   **Location Parsing**: In `pre_save`, if `rack` (ForeignKey) and `shelf` (PositiveSmallInteger) are provided, the system auto-updates `location` to `f"{rack.name} - Shelf {shelf}"`. If a raw string is sent, it parses it using `Rack\s+([A-Za-z0-9]+)\s*-\s*Shelf\s*([0-9]+)` to auto-associate the `Rack` foreign key and shelf.

### 3.2 Go Microservice
*   **Connection Pool Limits**: Max Idle Connections = 10, Max Open Connections = 50, Connection Max Lifetime = 1 hour, Max Idle Time = 15 minutes.
*   **Logging**: Use standard library `log/slog` structured logs.
*   **Sanitization**: User search filters must pass through `escapeMeiliFilterValue` (which replaces `\`, `'`, and trims `\n`, `\r`) before query injection.

### 3.3 React & TypeScript
*   **API Client (`useApi.ts`)**:
    *   Intercepts `/api/` urls and maps them to `/api/v1/` targets (unless starting with `/api/go/` or `/api/events/`).
    *   Injects custom header `X-Requested-With: XMLHttpRequest` for state-changing operations to trigger Django CSRF protection on cookies.
    *   Automatically extracts list results if the response includes a wrapper payload (`results` array).
    *   Performs exponential backoff retries (up to 3 times) for network/timeout errors.
*   **SSE Event Handler (`useRealtimeSync.ts`)**:
    *   Acquires a single-use UUID ticket via `POST /api/auth/sse-ticket/`.
    *   Connects to `/api/events/?ticket=<ticket>`.
    *   Deduplicates updates within a 3-second window using a signature set `recentEvents.current`.
    *   Invalidates specific React Query caches depending on the event payload (e.g., `DIE_UPDATE_EVENT` invalidates `['dies']`, `['search']`, `['stats']`).
*   **Virtualized UI**: Large inventory grids containing many records must utilize `react-window` virtualizers. The inventory EXPLORER tree uses a high default page size state `100000` to ensure no components are missing in the sidebar tree.

---

## 4. Testing Strategy

### 4.1 Test Execution Matrix
*   **Django Test Suite**: Runs via the Django test runner:
    ```bash
    python backend/manage.py test
    ```
*   **Go Test Suite**: Runs Go unit tests:
    ```bash
    go test -v ./... # from go-api/
    ```
*   **Vitest Suite**: Runs React unit tests:
    ```bash
    npm run test # from frontend/
    ```
*   **E2E Playwright Suite**: Runs frontend end-to-end integration checks:
    ```bash
    npm run test:e2e # from frontend/
    ```

### 4.2 Test Environment Invariants
*   Django test settings disable global `ATOMIC_REQUESTS` to prevent transaction boundary pollution.
*   Celery tasks are executed synchronously during testing (`CELERY_TASK_ALWAYS_EAGER = True`).
*   During test execution, Meilisearch index targets are dynamically routed to `dies_test` instead of `dies`.

---

## 5. Dependency Pinning Policy

1.  **Pinning Guarantee**: Every added dependency must be strictly version-pinned. Range operators (`^`, `>=`, `~`) are forbidden in backend packages (`requirements.txt`) and Docker tags.
2.  **Local Package Versions**:
    *   Python Backend: Django 4.2.21, Django REST Framework 3.15.2, djangorestframework-simplejwt 5.3.1.
    *   Go Service: Go 1.22, `github.com/lib/pq v1.10.9`, `github.com/meilisearch/meilisearch-go v0.26.3`.
    *   Frontend Node modules: React 18.2.0, Vite 5.1.0, Tailwind CSS 3.4.1.
3.  **Addition Guard**: Do not import external packages for helpers that can be written natively in under 50 lines of clean code.

---

## 6. Error Handling Invariants

1.  **Structured Go Errors**: The Go search proxy must return formatted responses conforming to the `ProblemDetails` schema:
    ```json
    {
      "title": "Descriptive short title",
      "status": 400,
      "detail": "Actionable error reasons",
      "instance": "/api/route"
    }
    ```
2.  **State-Changing Error Interception**: The React hook client `useApi` must trap eviction alerts (`code: session_evicted`) to clean cached storage logs and route users back to login without unauthenticated page flashes.
3.  **Validation Response Contracts**: Django serializer validation exceptions must return mapped dictionary keys corresponding to failing fields to enable UI display markers.

---

## 7. Logging & Auditing Rules

1.  **Structured JSON Logs**: Monolith logs must use the JSON formatter defined in `dms.logging.JsonFormatter`. Raw print messages are blocked.
2.  **Go Logging**: Go handlers must write structured context details to the standard logger (`log/slog`) (e.g., `slog.Info("SSE Client registered", "total_active", count)`).
3.  **Auditing Invariant**: Changes to dies are audit-logged in `DieHistory` via ORM signals. The history logs are read-only and must never be generated manually inside serializers or service workflows.

---

## 8. Spreadsheet Parser Conventions

1.  **Case-Insensitive Header Mapping**: Column header matching must normalize headers (`header.strip().lower()`) and support aliases:
    *   Sizing parameter mappings: accept both `punched_size` and `original_size`; accept `punched_width` and `original_width`; accept `punched_thickness` and `original_thickness`.
2.  **Dry-run transactional rollbacks**: Bulk dry-run imports must wrap each row execution in a transaction savepoint and execute `transaction.set_rollback(True)` to validate data parser rules without persisting data.
3.  **Bypass Sync Hook during Import**: The bulk import service must temporarily disable single search indexing hooks by setting `_thread_locals.skip_single_sync = True` to avoid N+1 DB locks, executing a single batch sync (`SearchService.sync_dies_batch`) at the end.
