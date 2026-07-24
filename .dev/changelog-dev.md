# Engineering Implementation History (changelog-dev.md)

### 2026-07-24 · Complete UI/UX Redesign of the Die Inventory Section
*   **Feature**: Complete visual redesign, responsiveness enhancement, and UX hardening of the Die Inventory section. Redesigned list view with multi-view toggles (Grid/List/Rack layout), customized collapsible FilterPanel, step-by-step registration wizard guided by StepWizard component, dual-column asset detail workspace, slide-out edit form drawer, Meilisearch pagination matching, and styled Excel-import uploader dropzone with drag-and-drop support. Checked all changes against full test suite (53 tests passing) and verified Vite production compilation.
*   **Affected Modules**: `frontend`
*   **Files Modified**:
    *   [useInventoryState.ts](file:///D:/DMS/dms-o2/frontend/src/features/inventory/hooks/useInventoryState.ts) - Exposed location queries, adjusted defaults to 25 items.
    *   [FilterPanel.tsx](file:///D:/DMS/dms-o2/frontend/src/features/inventory/components/FilterPanel.tsx) - Redesigned filtering widgets layout.
    *   [InventoryPage.tsx](file:///D:/DMS/dms-o2/frontend/src/features/inventory/components/InventoryPage.tsx) - Swapped search layouts and integrated hotkey listener.
    *   [InventorySubViews.tsx](file:///D:/DMS/dms-o2/frontend/src/features/inventory/components/InventorySubViews.tsx) - Swapped grid and rack results mapping.
    *   [DieDetailPage.tsx](file:///D:/DMS/dms-o2/frontend/src/features/inventory/components/DieDetailPage.tsx) - Structured dual-column spec grids, paginated history logs table, and integrated slide-out edit drawer.
    *   [CreateDieModal.tsx](file:///D:/DMS/dms-o2/frontend/src/features/inventory/components/CreateDieModal.tsx) - Rewrote forms into multi-step wizard step layouts.
    *   [ImportPage.tsx](file:///D:/DMS/dms-o2/frontend/src/pages/ImportPage.tsx) - Integrated drag-and-drop dropzones and formatted errors list.
*   **Documentation Updated**: `.dev/changelog-dev.md`, `.dev/state/progress.md`
*   **Testing Performed**: Verified with production build verify check and Vitest test suite runs (53 tests 100% green).

### 2026-07-24 · Complete UI/UX Redesign of the Users Admin Suite
*   **Feature**: Complete visual redesign, responsiveness enhancement, and UX hardening of the administrative suite. Replaced browser native alerts with accessible custom modals, built local search and filters for users, implemented a timeline-style user activity log, parsed device user-agents into OS/browser badges, and styled an intuitive permissions tree with Framer Motion entry animations. Preserved 100% of existing functionality, APIs, and business logic.
*   **Affected Modules**: `frontend`
*   **Files Modified**:
    *   [UsersPage.tsx](file:///D:/DMS/dms-o2/frontend/src/pages/UsersPage.tsx) - Styled tab controls with custom icons and spring layout-underlines.
    *   [UserManager.tsx](file:///D:/DMS/dms-o2/frontend/src/pages/users/UserManager.tsx) - Added local search/filters, avatar color generator, custom form inputs/toggles, timeline layout, and structured permission trees.
    *   [ActiveSessionsList.tsx](file:///D:/DMS/dms-o2/frontend/src/pages/users/ActiveSessionsList.tsx) - Integrated custom ConfirmDialog component, user-agent OS/browser parser, sticky headers, and bulk selection.
    *   [BackupManager.tsx](file:///D:/DMS/dms-o2/frontend/src/pages/users/BackupManager.tsx) - Redesigned action dashboard cards, drag-and-drop upload zone, and styled binary restore confirm prompts.
    *   [SessionAuditLogs.tsx](file:///D:/DMS/dms-o2/frontend/src/pages/users/SessionAuditLogs.tsx) - Refined query filters, added browser/OS device parser, sticky table, and styled pagination.
*   **Documentation Updated**: `.dev/changelog-dev.md`, `.dev/state/progress.md`
*   **Testing Performed**: Executed 16 frontend Vitest tests (100% passed) and verified Vite production compilation (`npm run build` completed successfully).

### 2026-07-23 · Advanced 3D Stress Visualizer, Granular Access Tree & Live Auth Sync (v1.9.2)

*   **Feature**: Built 3D von Mises Stress Heatmap visualizer (`StressHeatmap3D.tsx`) with interactive die angle ($2\alpha$) & bearing ($L_b$) sliders, 3D cutaway slice angle plane ($90^\circ \rightarrow 360^\circ$), glowing 3D internal chevron crack defect overlay (`>>>`), helical shear lines, and 3D Blueprint Snapshot downloader. Fixed `toFixed` areaReduction property access crash. Redesigned User Manager (`UserManager.tsx`) tool permissions into an indented tree hierarchy with visual badges (`3D Model`, `Theory Docs`). Completely hid unauthorized sub-modules from DOM in `WireDrawingCalculatorPage.tsx`. Added background live permission auto-sync (10s polling, window focus sync) in `AuthContext.tsx`.
*   **Affected Modules**: `frontend`
*   **Files Modified/Created**:
    *   [StressHeatmap3D.tsx](file:///D:/DMS/dms-o2/frontend/src/features/wire-drawing-calculator/components/StressHeatmap3D.tsx)
    *   [TheoryPanel.tsx](file:///D:/DMS/dms-o2/frontend/src/features/wire-drawing-calculator/components/TheoryPanel.tsx)
    *   [WireDrawingCalculatorPage.tsx](file:///D:/DMS/dms-o2/frontend/src/pages/WireDrawingCalculatorPage.tsx)
    *   [UserManager.tsx](file:///D:/DMS/dms-o2/frontend/src/pages/users/UserManager.tsx)
    *   [AuthContext.tsx](file:///D:/DMS/dms-o2/frontend/src/contexts/AuthContext.tsx)
    *   [lazyWithRetry.ts](file:///D:/DMS/dms-o2/frontend/src/utils/lazyWithRetry.ts)
    *   [lazyWithRetry.test.tsx](file:///D:/DMS/dms-o2/frontend/src/utils/lazyWithRetry.test.tsx)
    *   [App.tsx](file:///D:/DMS/dms-o2/frontend/src/App.tsx)
    *   [ErrorBoundary.tsx](file:///D:/DMS/dms-o2/frontend/src/components/ErrorBoundary.tsx)
    *   [vite.config.js](file:///D:/DMS/dms-o2/frontend/vite.config.js)
    *   [useRealtimeSync.ts](file:///D:/DMS/dms-o2/frontend/src/hooks/useRealtimeSync.ts)
    *   [package.json](file:///D:/DMS/dms-o2/frontend/package.json)
*   **Documentation Updated**: `.dev/changelog-dev.md`, `.dev/state/progress.md`, `.dev/state/active-task.md`, `CHANGELOG.md`, `PROJECT.md`
*   **Testing Performed**: Ran 16 Vitest frontend tests (`npm test`) - 100% passed. Executed `npm run build` production build successfully.

### 2026-07-22 · Fix Search Size Precision & Dimension Relevance Scoring
*   **Feature**: Fixed false-positive size search results by replacing arbitrary string substring matching on numeric dimension fields (`CurrentSize`, `CurrentWidth`, `CurrentThickness`) with exact/prefix dimension matching, normalized `"mm"` unit suffixes for float parsing, enforced score > 50 filter on digit queries for Meilisearch hits, and updated PostgreSQL direct query builder `buildWhereClauses` to use prefix matching (`cleanQ%`) on numeric fields.
*   **Affected Modules**: `go-api`
*   **Files Modified**:
    *   [handlers.go](file:///D:/DMS/dms-o2/go-api/internal/handlers/handlers.go)
    *   [database.go](file:///D:/DMS/dms-o2/go-api/internal/database/database.go)
    *   [handlers_test.go](file:///D:/DMS/dms-o2/go-api/internal/handlers/handlers_test.go)
*   **Documentation Updated**: `.dev/architecture/coding-standards.md`, `.dev/modules/go-api.md`, `CHANGELOG.md`
*   **Testing Performed**: Ran Go test suite successfully (`go test ./...` in `go-api`), verified 100% test pass including new unit test cases.

### 2026-07-19 · Phase 1 Security Upgrades
*   **Feature**: Unified Auth Interface, Outbox Integrity Hashing, and Dev Secrets protection.
*   **Affected Modules**: `go-api`, `dies`, `users`, `search`
*   **Files Modified**:
    *   [auth.go](file:///go-api/internal/auth/auth.go)
    *   [config.go](file:///go-api/internal/config/config.go)
    *   [auth.py](file:///backend/users/views/auth.py)
    *   [models.py](file:///backend/dies/models.py)
    *   [tasks.py](file:///backend/search/tasks.py)
*   **Documentation Updated**: `docs/ARCHITECTURE.md`, `wiki/Roadmap.md`
*   **Migration Notes**: Manual migration `dies/migrations/0005_outboxtask_payload_hash.py` generated successfully.
*   **Testing Performed**: Verified compilation of Go service and successful Django migrations generation.

### 2026-07-19 · Phase 2, 3 & 4 Upgrades (Schema Hardening, Database Consolidation & Wear Forecasting)
*   **Feature**: Structured Location coordinates schema, decimal sizing positive validations, complete audit expansion to Sets/Machines/Racks, consolidated DB backups & history pruning under Celery Beat (eliminating duplicate backup container), boosted Go unit test coverage, daily wear checks scheduled tasks, and live predictive lifetime remaining days integration on dashboard cards.
*   **Affected Modules**: `go-api`, `dies`, `users`, `history`, `machines`, `frontend`
*   **Files Modified**:
    *   [models.py (dies)](file:///backend/dies/models.py)
    *   [serializers.py (dies)](file:///backend/dies/serializers.py)
    *   [signals.py (dies)](file:///backend/dies/signals.py)
    *   [tasks.py (dies)](file:///backend/dies/tasks.py)
    *   [wear_alert_service.py](file:///backend/dies/services/wear_alert_service.py)
    *   [settings.py](file:///backend/dms/settings.py)
    *   [models.py (history)](file:///backend/history/models.py)
    *   [signals.py (machines)](file:///backend/machines/signals.py)
    *   [permissions.py](file:///backend/users/permissions.py)
    *   [backup_service.py](file:///backend/users/services/backup_service.py)
    *   [tasks.py (users)](file:///backend/users/tasks.py)
    *   [database.go](file:///go-api/internal/database/database.go)
    *   [cache_test.go](file:///go-api/internal/cache/cache_test.go)
    *   [config_test.go](file:///go-api/internal/config/config_test.go)
    *   [RoundDieCard.tsx](file:///frontend/src/features/dashboard/components/RoundDieCard.tsx)
    *   [FlatDieCard.tsx](file:///frontend/src/features/dashboard/components/FlatDieCard.tsx)
    *   [types.ts (frontend)](file:///frontend/src/types.ts)
*   **Migrations Generated**:
    *   `dies/0006_rename_shelf_die_shelf_number.py`
    *   `dies/0007_alter_flatdie_current_thickness_and_more.py`
    *   `dies/0008_die_predicted_remaining_days.py`
    *   `history/0002_alter_machinehistory_entity_type.py`
*   **Testing Performed**: Ran Go test suite successfully (all checks pass, coverages boosted), verified Django migrations generated with no issues, performed django system checks successfully.

### 2026-07-20 · Phase 5: Observability, DX & Infrastructure Upgrades
*   **Feature**: Structured JSON logging (Go and Python), Sentry & OpenTelemetry Tracing, Prometheus metrics endpoints, isolated Redis cache DB for unit tests, resolved Meilisearch async test flakes, local pre-commit config setup, and backup streaming to S3/MinIO.
*   **Affected Modules**: `go-api`, `dies`, `users`, `search`
*   **Files Modified/Created**:
    *   [cache.go](file:///go-api/internal/cache/cache.go)
    *   [handlers.go](file:///go-api/internal/handlers/handlers.go)
    *   [handlers_test.go](file:///go-api/internal/handlers/handlers_test.go)
    *   [settings.py](file:///backend/dms/settings.py)
    *   [urls.py (dms)](file:///backend/dms/urls.py)
    *   [auth.py (users)](file:///backend/users/views/auth.py)
    *   [requirements.txt](file:///backend/requirements.txt)
    *   [test_search.py](file:///backend/dies/tests/test_search.py)
    *   [test_import.py](file:///backend/dies/tests/test_import.py)
    *   [tasks.py (search)](file:///backend/search/tasks.py)
    *   [backup_service.py](file:///backend/users/services/backup_service.py)
    *   [.pre-commit-config.yaml](file:///.pre-commit-config.yaml)
*   **Testing Performed**: Rebuilt docker environment; ran and passed 129 Django unit tests and 6 Go packages unit tests successfully (100% green).

### 2026-07-22 · Phase 6: Security Hardening & Infrastructure Resilience
*   **Feature**: Security headers middleware, request size limits, Redis AOF persistence, Docker resource limits, and Redis connection pooling improvements.
*   **Affected Modules**: `go-api`, `dies`, `infrastructure`
*   **Files Modified/Created**:
    *   [middleware/security.go](file:///go-api/internal/middleware/security.go) - New security headers and request size limit middleware
    *   [main.go (go-api)](file:///go-api/cmd/server/main.go) - Applied security headers, request size limits, and server timeouts
    *   [views.py (dies)](file:///backend/dies/views.py) - Refactored ImportDiesView to use Django cache framework instead of raw Redis connections
    *   [docker-compose.yml](file:///docker-compose.yml) - Added Redis AOF persistence, Docker resource limits, and redis_data volume
*   **Security Improvements**:
    *   Added production-standard security headers: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`
    *   Added 10MB request body size limit to prevent DoS attacks
    *   Added server timeouts (ReadHeader: 10s, Read: 30s, Write: 30s, Idle: 120s)
    *   Refactored Redis connection management to use Django's cache framework with connection pooling
*   **Infrastructure Improvements**:
    *   Enabled Redis AOF persistence with `appendfsync everysec` for data durability
    *   Added Redis maxmemory limit (256MB) with LRU eviction policy
    *   Added Docker resource limits to all services (memory and CPU)
*   **Testing Performed**: Verified Go code compiles successfully, Django changes are syntactically correct.
*   **Documentation Updated**: `.dev/changelog-dev.md`, `.dev/security.md`, `.dev/decisions.md`, `.dev/deployment.md`

### 2026-07-22 · Location Grid & Physical Schema (Roadmap Phase 2)
*   **Feature**: Migrated free-text `Die.location` to structured `rack` (FK) + `shelf_number` fields with validation.
*   **Affected Modules**: `dies`, `machines`
*   **Files Modified/Created**:
    *   [models.py (dies)](backend/dies/models.py) - Removed `location` field, kept `rack` FK and `shelf_number`
    *   [serializers.py (dies)](backend/dies/serializers.py) - Removed `location` from all serializers, added location validation
    *   [views.py (dies)](backend/dies/views.py) - Replaced `location` filter with `rack_id` and `shelf_number` filters, updated import template
    *   [validation_service.py](backend/dies/services/validation_service.py) - Added `validate_location()` method
    *   [test_location_validation.py](backend/dies/tests/test_location_validation.py) - New test file for location validation
    *   [0009_populate_location_fields.py](backend/dies/migrations/0009_populate_location_fields.py) - Data migration to populate rack/shelf from location
    *   [0010_remove_die_location.py](backend/dies/migrations/0010_remove_die_location.py) - Schema migration to remove location field
*   **Database Changes**:
    *   Removed `location` VARCHAR(200) field from `die` table
    *   Removed GIN trigram index on `location`
    *   Added validation: `shelf_number` must be within rack dimensions (1 to row_count * column_count)
*   **API Changes**:
    *   Removed `location` filter parameter from `GET /api/dies/`
    *   Added `rack_id` and `shelf_number` filter parameters
    *   Import template now uses `rack` and `shelf_number` columns instead of `location`
*   **Testing Performed**: Syntactical verification of all modified files, validation tests created.
*   **Documentation Updated**: `.dev/modules/dies.md`, `.dev/architecture/database.md`, `.dev/changelog-dev.md`

### 2026-07-22 · Engineering Operating System Implementation
*   **Feature**: Complete Engineering Operating System for autonomous operation.
*   **Affected Modules**: `.dev/` directory structure
*   **Files Created/Modified**:
    *   [AGENTS.md](AGENTS.md) - Rewritten as lean entry point (65 lines)
    *   [.dev/processes/engineering-workflow.md](.dev/processes/engineering-workflow.md) - Engineering workflow with implementation patterns
    *   [.dev/processes/review-process.md](.dev/processes/review-process.md) - Review gates and checklists
    *   [.dev/processes/definition-of-done.md](.dev/processes/definition-of-done.md) - Completion criteria
    *   [.dev/operations/production-runbook.md](.dev/operations/production-runbook.md) - Operational procedures
    *   [.dev/metrics/metrics.md](.dev/metrics/metrics.md) - Quality measurements
    *   [.dev/state/active-task.md](.dev/state/active-task.md) - Current work tracking
    *   [.dev/state/current-goal.md](.dev/state/current-goal.md) - Current objective
    *   [.dev/state/progress.md](.dev/state/progress.md) - Implementation status
    *   [.dev/state/technical-debt.md](.dev/state/technical-debt.md) - Known debt items
    *   [.dev/risk-register.md](.dev/risk-register.md) - Project risks
    *   [.dev/modules/backend.md](.dev/modules/backend.md) - Django backend overview
    *   [.dev/architecture/api.md](.dev/architecture/api.md) - Expanded with full endpoint catalog
    *   [.dev/architecture/database.md](.dev/architecture/database.md) - Expanded with full schema
    *   [.dev/architecture/coding-standards.md](.dev/architecture/coding-standards.md) - Expanded with language standards
*   **Implementation Approach**:
    *   Phase 1: Directory restructure (14 files moved, 2 removed)
    *   Phase 2: Core documentation (AGENTS.md, processes, expanded architecture)
    *   Phase 3: State and operations (tracking, runbook, metrics, risks)
    *   Phase 4: Deferred (only when needed)
    *   Phase 5: Renamed operating system folder to `.dev/` for clean developer workflow
*   **Engineering Principles Applied**:
    *   Every document answers: Why? Who reads it? When updated?
    *   Fewer, richer documents over many small ones
    *   No placeholder files - all content useful from start
    *   Lean documentation approach
*   **Testing Performed**: Verified directory structure, committed in 3 phases.
*   **Documentation Updated**: `.dev/changelog-dev.md`

