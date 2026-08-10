# Engineering Implementation History (changelog-dev.md)

### 2026-08-10 Enamel Die Inventory, Machine Stock & Monthly Audits (Stocktake)
*   **Feature**: Created a comprehensive machine-specific die stock inventory and monthly recount system. Added Django backend models: `EnamelMachine` (dedicated for enameling lines), `MachineDieStock` (live stock tracker referencing EnamelMachine), `DieInventoryRecount` (audit sheet header), and `DieInventoryRecountItem` (audit quantities by size). Implemented DRF serializers, registered viewsets, and created a transaction-wrapped `/submit/` action that updates live enamel machine stock from audited tallies. Refactored the React frontend (`DieSetPlannerPage.tsx`) to support a tabbed interface (Calculator, Live Machine Stock, Stocktake & Recounts), inline CRUD management modal for Enamel Machines (adding, viewing, and deleting custom lines), dropdown options to quick-load machine/recount stocks, and spreadsheet-like modals for creating and committing audits.
*   **Affected Modules**: `backend`, `frontend`
*   **Files Modified**:
    *   [backend/dies/models.py](file:///home/sahil/Desktop/Projects/dms-o2/backend/dies/models.py) - Added EnamelMachine, MachineDieStock, DieInventoryRecount, DieInventoryRecountItem.
    *   [backend/dies/serializers.py](file:///home/sahil/Desktop/Projects/dms-o2/backend/dies/serializers.py) - Added serializers for EnamelMachine, stock, and recounts.
    *   [backend/dies/views.py](file:///home/sahil/Desktop/Projects/dms-o2/backend/dies/views.py) - Added EnamelMachineViewSet, MachineDieStockViewSet, and DieInventoryRecountViewSet with submit action.
    *   [backend/dms/urls.py](file:///home/sahil/Desktop/Projects/dms-o2/backend/dms/urls.py) - Registered views in router.
    *   [backend/dies/tests/test_inventory_recount.py](file:///home/sahil/Desktop/Projects/dms-o2/backend/dies/tests/test_inventory_recount.py) - New unit tests verifying EnamelMachine inventory APIs.
    *   [frontend/src/features/die-set-planner/types.ts](file:///home/sahil/Desktop/Projects/dms-o2/frontend/src/features/die-set-planner/types.ts) - Added TypeScript interfaces for EnamelMachine and updated stock/recount contracts.
    *   [frontend/src/features/die-set-planner/hooks/useDieInventory.ts](file:///home/sahil/Desktop/Projects/dms-o2/frontend/src/features/die-set-planner/hooks/useDieInventory.ts) - Added React Query hooks for recounts and EnamelMachine CRUD.
    *   [frontend/src/features/die-set-planner/components/DieSetPlannerPage.tsx](file:///home/sahil/Desktop/Projects/dms-o2/frontend/src/features/die-set-planner/components/DieSetPlannerPage.tsx) - Tabbed layout, loaders, stocktables, EnamelMachine configuration modal, and audit modals.
*   **Testing Performed**: Ran Django unit tests (`python manage.py test dies.tests.test_inventory_recount` 4/4 passed; full Django suite 172/172 passed); TypeScript type checks passed; Vitest frontend test suite 69/69 passed; Vite production build compiled successfully in 8.96s.

### 2026-08-10 Die Set Planner Unit Safety, Active Stock Validation & UX Hardening
*   **Feature**: Implemented physical unit conversion (inches to mm) in the Go engine (`NormalizeDieSize`) and TypeScript frontend (`normalizeDieSize`), resolving the unit safety issue where inches were stripped but treated as mm. Integrated contract-aligned `isDieActive` validation when loading live inventory to prevent planning against unusable (damaged/scrapped/missing/maintenance) dies. Hardened target validation (decimals/negative values) in the frontend with a clean alert panel, and added `Enter` key handlers on the target input. Designed visual "Capacity Explanation" and "Target Sets Assessment" cards for quick operational insight. Fixed accessibility issues by linking `InputCard` inputs to `<label>` elements.
*   **Affected Modules**: `go-api`, `frontend`
*   **Files Modified**:
    *   [go-api/internal/dieset/engine.go](file:///home/sahil/Desktop/Projects/dms-o2/go-api/internal/dieset/engine.go) - Physical unit conversion (inches to mm, multiplying by 25.4).
    *   [go-api/internal/dieset/engine_test.go](file:///home/sahil/Desktop/Projects/dms-o2/go-api/internal/dieset/engine_test.go) - Updated unit suffix tests for converted values.
    *   [frontend/src/features/die-set-planner/domain/parsers.ts](file:///home/sahil/Desktop/Projects/dms-o2/frontend/src/features/die-set-planner/domain/parsers.ts) - Client-side unit conversion synchronization.
    *   [frontend/src/features/die-set-planner/domain/parsers.test.ts](file:///home/sahil/Desktop/Projects/dms-o2/frontend/src/features/die-set-planner/domain/parsers.test.ts) - Converted value test case.
    *   [frontend/src/features/die-set-planner/components/DieSetPlannerPage.tsx](file:///home/sahil/Desktop/Projects/dms-o2/frontend/src/features/die-set-planner/components/DieSetPlannerPage.tsx) - `isDieActive` stock load validation, Capacity Explanation and Target Assessment panels, key handlers, label accessibility.
*   **Testing Performed**: `go test ./...` all passed; frontend `npx tsc --noEmit` type checked successfully; full Vitest suite 69/69 passed; production Vite build compiled cleanly.

### 2026-08-08 Die Set Planner Industrial Parsing, Precision & UX Hardening
*   **Feature**: Upgraded Go calculation engine (`engine.go` & `parser.go`) to use 100,000 multiplier keys (5 decimal places precision) for fine-wire die sizes (e.g. `0.0625`), unit label stripping (`mm`, `in`, `"`, `inch`, `inches`), European decimal comma conversion (`0,620`), Excel float quantity parsing (`4.0`), and target set upper limit safety checks (`targetSets <= 1,000,000,000`). Upgraded `DieSetPlannerPage.tsx` with **Load Active Stock** action (queries live DMS database `/api/go/search?limit=5000`), **Sample Data** loader button, **Export CSV** downloadable report, breakdown table status filters (**All**, **Bottlenecks**, **Missing**, **OK**), size search input, and `Ctrl+Enter` shortcut.
*   **Affected Modules**: `go-api`, `frontend`, `docs`
*   **Files Modified**:
    *   [go-api/internal/dieset/engine.go](file:///D:/DMS/dms-o2/go-api/internal/dieset/engine.go) - 100,000 multiplier, unit stripping, European decimal comma, target limits.
    *   [go-api/internal/dieset/parser.go](file:///D:/DMS/dms-o2/go-api/internal/dieset/parser.go) - `parseQuantity` float string support, `isUnitToken` helper, token walk logic.
    *   [go-api/internal/dieset/engine_test.go](file:///D:/DMS/dms-o2/go-api/internal/dieset/engine_test.go) - Updated test assertions for 100k keys + unit/comma/float/limit tests.
    *   [frontend/src/features/die-set-planner/domain/parsers.ts](file:///D:/DMS/dms-o2/frontend/src/features/die-set-planner/domain/parsers.ts) - Synchronized TypeScript parser functions.
    *   [frontend/src/features/die-set-planner/domain/parsers.test.ts](file:///D:/DMS/dms-o2/frontend/src/features/die-set-planner/domain/parsers.test.ts) - Updated Vitest tests for 100k keys and industrial formats.
    *   [frontend/src/features/die-set-planner/components/DieSetPlannerPage.tsx](file:///D:/DMS/dms-o2/frontend/src/features/die-set-planner/components/DieSetPlannerPage.tsx) - Load Active Stock, Sample Data, Export CSV, table filters, search, and shortcuts.
* **Testing Performed**: `go test ./...` all pass (`dieset` + `handlers`); `npx tsc --noEmit` clean (0 errors); Vitest suite 69/69 green; production Vite build clean; git commit `53007fe`.

### 2026-08-08 Add Die Set Procurement Plan (target sets)
*   **Feature**: Optional `target_sets` in `POST /api/go/tools/calculate/die-set`. When the target exceeds current producible sets, the Go engine computes a `procurement` list: which die sizes to purchase and how many of each (`procure = target*required_per_set - available`, only shortfalls). Frontend gains a "Target Sets" input and a Procurement Plan table (requirement/set, needed for target, in stock, to buy), plus an "already achievable" note when no purchase is needed.
*   **Affected Modules**: `go-api`, `frontend`, `docs`
*   **Files Modified**:
    *   [go-api/internal/dieset/engine.go](file:///D:/DMS/dms-o2/go-api/internal/dieset/engine.go) - `CalculateSeriesCapacityForTarget`, `ProcurementItem`, refactored shared capacity core.
    *   [go-api/internal/handlers/handlers.go](file:///D:/DMS/dms-o2/go-api/internal/handlers/handlers.go) - `target_sets` wired through to the target-capable engine call.
    *   [go-api/internal/dieset/engine_test.go](file:///D:/DMS/dms-o2/go-api/internal/dieset/engine_test.go) - Procurement plan table tests (shortfall, already-achievable, zero/negative target).
    *   [go-api/internal/handlers/handlers_test.go](file:///D:/DMS/dms-o2/go-api/internal/handlers/handlers_test.go) - `target_sets` returns procurement; negative target 422.
    *   [frontend/src/features/die-set-planner/types.ts](file:///D:/DMS/dms-o2/frontend/src/features/die-set-planner/types.ts) - `ProcurementItem`, `target_sets` request/result fields.
    *   [frontend/src/features/die-set-planner/components/DieSetPlannerPage.tsx](file:///D:/DMS/dms-o2/frontend/src/features/die-set-planner/components/DieSetPlannerPage.tsx) - Target sets input + Procurement Plan table + Copy Result support.
* **Testing Performed**: `go build`/`vet`/`test ./...` all green; frontend `tsc --noEmit` clean; eslint 0 errors; full Vitest suite 68/68 green.

### 2026-08-08 Move Die Set Parsing + Math to Backend (Go authoritative)
*   **Change**: All parsing, validation, policy (quantity-less dies, duplicate aggregation), and calculation now live in the Go engine. `POST /api/go/tools/calculate/die-set` accepts raw pasted text `{"inventory_text": "...", "series_text": "..."}`; `go-api/internal/dieset/parser.go` is the authoritative line-based parser (lone dies become zero-quantity stock with warning, header-row skip, per-line errors) and `engine.go` computes. The frontend parser is now a client-side pre-check only; the page sends raw text unchanged.
*   **Affected Modules**: `go-api`, `frontend`, `docs`
*   **Files Modified/Created**:
    *   [go-api/internal/dieset/parser.go](file:///D:/DMS/dms-o2/go-api/internal/dieset/parser.go) - New authoritative parser for inventory + series text.
    *   [go-api/internal/handlers/handlers.go](file:///D:/DMS/dms-o2/go-api/internal/handlers/handlers.go) - Request struct now `inventory_text`/`series_text`; handler parses via dieset and merges parse warnings.
    *   [go-api/internal/handlers/handlers_test.go](file:///D:/DMS/dms-o2/go-api/internal/handlers/handlers_test.go) - Raw-text fixture values + lone-die regression via API.
    *   [go-api/internal/dieset/engine_test.go](file:///D:/DMS/dms-o2/go-api/internal/dieset/engine_test.go) - ParseInventoryText/ParseSeriesText tests.
    *   [frontend/src/features/die-set-planner/types.ts](file:///D:/DMS/dms-o2/frontend/src/features/die-set-planner/types.ts) - Request now raw text fields.
    *   [frontend/src/features/die-set-planner/components/DieSetPlannerPage.tsx](file:///D:/DMS/dms-o2/frontend/src/features/die-set-planner/components/DieSetPlannerPage.tsx) - Sends raw text; client parser is pre-check only.
* **Testing Performed**: `go build`/`vet`/`test ./...` all green (dieset + handlers incl. new parser suites); frontend `tsc --noEmit` clean; eslint 0 errors; full Vitest suite 68/68 green.

### 2026-08-08 Fix Die Set Inventory Paste-Parser False Errors
*   **Fix**: Real pasted inventory sheets contain dies listed without a quantity (blank cell). The flattened token parser treated the next row's die size as that row's quantity, producing hundreds of false `invalid quantity` errors and mis-paired data. Parsing is now line-based: each line is its own row; a lone decimal die size becomes a zero-quantity stock row with an aggregated summary warning; tab/space tolerance and header-row skip preserved; duplicate aggregation now emits a single summary warning.
*   **Affected Modules**: `frontend`
*   **Files Modified**:
    *   [frontend/src/features/die-set-planner/domain/parsers.ts](file:///D:/DMS/dms-o2/frontend/src/features/die-set-planner/domain/parsers.ts) - Line-based `parseInventoryInput` with die-only row detection (decimal-point heuristic keeps pure integers as quantities).
    *   [frontend/src/features/die-set-planner/domain/parsers.test.ts](file:///D:/DMS/dms-o2/frontend/src/features/die-set-planner/domain/parsers.test.ts) - Regression tests: mixed paste with lone dies, lone-die blocks, integer-as-quantity bounds.
* **Testing Performed**: Vitest parser suite 17/17 green; full frontend suite 68/68 green; `tsc --noEmit` clean; `eslint` 0 errors.

### 2026-08-08 · Implement Die Set Planner Tool
*   **Feature**: Added a Die Set Planner tool that calculates how many complete die sets the current die inventory can produce. Users paste inventory + one die series; the app parses and validates both, then reports maximum complete sets, bottleneck dies, missing dies, used/remaining stock, and unused inventory.
*   **Affected Modules**: `go-api`, `frontend`, `docs`
*   **Files Modified/Created**:
    *   [go-api/internal/dieset/engine.go](file:///D:/DMS/dms-o2/go-api/internal/dieset/engine.go) - New isolated business-logic engine: `NormalizeDieSize` (thousandths-integer keys, no float equality), `FormatDieSize`, `CalculateSeriesCapacity` (floor division, global minimum, bottleneck/missing/unused detection).
    *   [go-api/internal/dieset/engine_test.go](file:///D:/DMS/dms-o2/go-api/internal/dieset/engine_test.go) - Table-driven engine tests (basic, multi-bottleneck, missing, zero, duplicates, decimal normalization, unused, invalid input).
    *   [go-api/internal/handlers/handlers.go](file:///D:/DMS/dms-o2/go-api/internal/handlers/handlers.go) - Added `HandleCalculateDieSet` endpoint handler + `DieSetCalculateRequest` struct.
    *   [go-api/cmd/server/main.go](file:///D:/DMS/dms-o2/go-api/cmd/server/main.go) - Registered `POST /api/go/tools/calculate/die-set`.
    *   [go-api/internal/handlers/handlers_test.go](file:///D:/DMS/dms-o2/go-api/internal/handlers/handlers_test.go) - Endpoint tests (valid calc, missing die, 422/400/405).
    *   [frontend/src/features/die-set-planner/domain/parsers.ts](file:///D:/DMS/dms-o2/frontend/src/features/die-set-planner/domain/parsers.ts) - Pure text parsers (spreadsheet/tab/space paste, header skip, duplicate warnings, normalization).
    *   [frontend/src/features/die-set-planner/domain/parsers.test.ts](file:///D:/DMS/dms-o2/frontend/src/features/die-set-planner/domain/parsers.test.ts) - 14 Vitest parser tests.
    *   [frontend/src/features/die-set-planner/components/DieSetPlannerPage.tsx](file:///D:/DMS/dms-o2/frontend/src/features/die-set-planner/components/DieSetPlannerPage.tsx) - Planner page (paste, calculate, complete-set hero, breakdown table, bottleneck chips, missing + unused panels, copy/reset).
    *   [frontend/src/features/die-set-planner/hooks/useDieSetPlanner.ts](file:///D:/DMS/dms-o2/frontend/src/features/die-set-planner/hooks/useDieSetPlanner.ts) - API hook calling the Go endpoint.
    *   [frontend/src/App.tsx](file:///D:/DMS/dms-o2/frontend/src/App.tsx) - Lazy route `/die-set-planner` guarded by `ProtectedRoute` toolId.
    *   [frontend/src/pages/ToolsPage.tsx](file:///D:/DMS/dms-o2/frontend/src/pages/ToolsPage.tsx) - New tool card.
    *   [frontend/src/contexts/AuthContext.tsx](file:///D:/DMS/dms-o2/frontend/src/contexts/AuthContext.tsx) - Added `die-set-planner` to ROOT default authorized tools.
    *   [frontend/src/components/Navbar.tsx](file:///D:/DMS/dms-o2/frontend/src/components/Navbar.tsx) - Desktop dropdown + mobile links.
    *   [frontend/src/pages/users/UserManager.tsx](file:///D:/DMS/dms-o2/frontend/src/pages/users/UserManager.tsx) - Permission toggle + badge label.
* **Testing Performed**: Go `build`/`vet`/`test ./...` all pass (dieset + handler suites); frontend `tsc --noEmit` clean; `eslint` 0 errors (pre-existing warnings only); full Vitest suite 65/65 green; production Vite build succeeds.

### 2026-08-05 · Implement User Administration Section Upgrades & Visual Alignment Fixes
*   **Feature**: Implemented client-side Export to CSV feature for Security Audit Logs, added Search Query Highlighting for User Directory and Security Audit Logs search results, and removed unused imports in `UserManager.tsx` to maintain lint cleanliness. Adjusted the "Filters" toggle button in the Die Registry Inventory page to align height and corner rounding with the adjacent SearchBar component. Fixed the blank print page issue on the Die Asset details layout.
*   **Affected Modules**: `frontend`
*   **Files Modified**:
    *   [frontend/src/pages/users/UserManager.tsx](file:///D:/DMS/dms-o2/frontend/src/pages/users/UserManager.tsx) - Added search query highlighting and cleaned up imports.
    *   [frontend/src/pages/users/SessionAuditLogs.tsx](file:///D:/DMS/dms-o2/frontend/src/pages/users/SessionAuditLogs.tsx) - Added Export to CSV option and search query highlighting.
    *   [frontend/src/features/inventory/components/InventoryPage.tsx](file:///D:/DMS/dms-o2/frontend/src/features/inventory/components/InventoryPage.tsx) - Corrected Filter button height, corner radius (`rounded-2xl`), padding (`py-3.5 px-6`), and text size (`text-sm`) to match SearchBar.
    *   [frontend/src/features/inventory/components/DieDetailPage.tsx](file:///D:/DMS/dms-o2/frontend/src/features/inventory/components/DieDetailPage.tsx) - Replaced outer container class `print:hidden` with `print-container` and added `print:hidden` to action buttons.
*   **Testing Performed**: Executed frontend typecheck using `npx tsc --noEmit` and verified the build integrity.

### 2026-08-03 · Implement Custom Workspace Dev Tools & Antigravity Extensions
*   **Feature**: Created local shell/python developer utilities to run toolchain checks, dependency audits, and search indexing checks. Integrated custom Model Context Protocol (MCP) server and operational skill for Google Antigravity.
*   **Affected Modules**: `scripts`, `agents`
*   **Files Modified/Created**:
    *   [scripts/env-doctor.sh](file:///home/sahil/Desktop/Projects/dms-o2/scripts/env-doctor.sh) - Developer toolchain and container health checker.
    *   [scripts/dependency-auditor.sh](file:///home/sahil/Desktop/Projects/dms-o2/scripts/dependency-auditor.sh) - Consolidated packages/CVE auditor.
    *   [scripts/sync-meili.sh](file:///home/sahil/Desktop/Projects/dms-o2/scripts/sync-meili.sh) - Wrapper to synchronize database entities with Meilisearch index.
    *   [scripts/dms_mcp_server.py](file:///home/sahil/Desktop/Projects/dms-o2/scripts/dms_mcp_server.py) - Stdinstdout JSON-RPC 2.0 Model Context Protocol (MCP) server for Antigravity schema/Redis inspections.
    *   [.agents/skills/dms-o2-ops/SKILL.md](file:///home/sahil/Desktop/Projects/dms-o2/.agents/skills/dms-o2-ops/SKILL.md) - Project operational guides and coding standards for agents.
*   **Testing Performed**: Executed env-doctor and auditor script runs locally. Verified stdout/stderr streams of the MCP server. Passed Go and frontend unit test suites.

### 2026-08-03 · Execute Phase 2 & Phase 3 Package Security Audits & Upgrades
*   **Feature**: Audited all dependencies across frontend, Django backend, and Go API tiers. Upgraded libraries to their latest safe and verified patch/minor versions to remediate security warnings while maintaining strict compatibility constraints (such as preserving Go 1.22 compatibility for container compilation). Formulated and documented a comprehensive major version migration planning guide.
*   **Affected Modules**: `backend`, `frontend`, `go-api`
*   **Files Modified/Created**:
    *   [backend/requirements.txt](file:///home/sahil/Desktop/Projects/dms-o2/backend/requirements.txt) - Upgraded Django (4.2.30), DRF (3.17.1), SimpleJWT (5.5.1), Celery (5.6.3), Gunicorn (26.0.0), psycopg2 (2.9.12), sentry-sdk (2.66.1), boto3 (1.43.62), django-cors-headers (4.9.0), and django-prometheus (2.5.0).
    *   [go-api/go.mod](file:///home/sahil/Desktop/Projects/dms-o2/go-api/go.mod) - Upgraded lib/pq (v1.12.3), go-redis/v9 (v9.18.0), fasthttp (v1.59.0), and golang-jwt/jwt/v4 (v4.5.2).
    *   [frontend/package.json](file:///home/sahil/Desktop/Projects/dms-o2/frontend/package.json) - Upgraded vite (5.4.21), vitest (1.6.1), framer-motion (11.18.2), @tanstack/react-query (5.101.4), and added npm override for dompurify (3.4.12) to patch sub-dependency XSS warnings.
*   **Documentation Created**: [discovery_report.md](file:///home/sahil/.gemini/antigravity-cli/brain/32d82d21-d483-4f8a-8c4a-241fa9df4e2a/discovery_report.md), [migration_plan.md](file:///home/sahil/.gemini/antigravity-cli/brain/32d82d21-d483-4f8a-8c4a-241fa9df4e2a/migration_plan.md)
*   **Testing Performed**: Rebuilt all docker containers (`go-api`, `django`) successfully. Ran full frontend Vitest test suites (51/51 tests green), Go API tests (100% green), and Django system check framework validations (PASS).

### 2026-07-28 · Disable Mutual TLS (mTLS) & Revert to One-Way TLS
*   **Feature**: Reverted TLS client authentication type from `RequireAndVerifyClientCert` to `NoClientCert` to disable client certificate verification. This simplifies client access by only requiring the local root CA to be installed and trusted, avoiding repeated client certificate prompts in modern browsers (Chrome, Edge, Firefox). Updated installation bat/sh scripts and cert generation logic to dynamically skip client certificates when mTLS is disabled. Cleared all unnecessary client certificate files from the workspace.
*   **Affected Modules**: `gateway`, `scripts`, `docs`
*   **Files Modified/Created**:
    *   [dynamic.yml](file:///D:/DMS/dms-o2/dynamic.yml) - Removed `clientAuth` block, switching Traefik default TLS options to one-way TLS.
    *   [scripts/client-install-template.bat](file:///D:/DMS/dms-o2/scripts/client-install-template.bat) - Configured sequential auto-select registry rules starting from index 1.
    *   [scripts/client-install-template.sh](file:///D:/DMS/dms-o2/scripts/client-install-template.sh) - Updated Chrome, Edge, and Firefox auto-select rules for local development.
    *   [scripts/generate-certs.bat](file:///D:/DMS/dms-o2/scripts/generate-certs.bat) - Added LAN IP injection into template files.
    *   [scripts/generate-certs.sh](file:///D:/DMS/dms-o2/scripts/generate-certs.sh) - Added LAN IP injection into template files.
*   **Documentation Updated**: [README.md](file:///D:/DMS/dms-o2/README.md), `.dev/changelog-dev.md`
*   **Testing Performed**: Verified dynamic file reload in Traefik. Tested that no client certificates are generated by setup scripts. Verified Traefik container status as healthy.

### 2026-07-27 Â· Implement Mutual TLS (mTLS) Client Certificate Authentication
*   **Feature**: Configured Traefik gateway to require Mutual TLS (mTLS) client certificate authentication. Created cross-platform client certificate generation scripts that issue client certificates signed by the local root CA and export them to PKCS#12 (`.p12`) format for installation on authorized devices. Added Windows and macOS/Linux automated one-click installation helper scripts (`client-*-install.bat` and `client-*-install.sh`) to eliminate manual GUI certificate store selection. Updated setup scripts to dynamically detect if mTLS is enabled, auto-generate a client certificate (`.p12` bundle) for the host machine, and make the Postgres database readiness check dynamic. Added certificate uninstallation and cleanup scripts for Unix and Windows systems.
*   **Affected Modules**: `gateway`, `scripts`, `makefile`
*   **Files Modified/Created**:
    *   [dynamic.yml](file:///C:/Users/sahil/Desktop/Projects/dms-o2/dynamic.yml) - Configured default TLS options to require client certificates and verify them against `/certs/rootCA.pem`.
    *   [scripts/generate-client-cert.bat](file:///C:/Users/sahil/Desktop/Projects/dms-o2/scripts/generate-client-cert.bat) - Added Windows script to generate client certificates and client-specific automated installers.
    *   [scripts/generate-client-cert.sh](file:///C:/Users/sahil/Desktop/Projects/dms-o2/scripts/generate-client-cert.sh) - Added Linux/macOS script to generate client certificates and client-specific automated installers.
    *   [scripts/client-install-template.bat](file:///C:/Users/sahil/Desktop/Projects/dms-o2/scripts/client-install-template.bat) - Created Windows auto-installer template (PowerShell import logic inside bat).
    *   [scripts/client-install-template.sh](file:///C:/Users/sahil/Desktop/Projects/dms-o2/scripts/client-install-template.sh) - Created macOS/Linux keychain/trust-store installer shell script template.
    *   [scripts/client-instructions-template.txt](file:///C:/Users/sahil/Desktop/Projects/dms-o2/scripts/client-instructions-template.txt) - Created standard client-side certificate installation template for distribution.
    *   [scripts/uninstall-certs.bat](file:///C:/Users/sahil/Desktop/Projects/dms-o2/scripts/uninstall-certs.bat) - Added Windows script to completely uninstall root CA from system trust store and delete all local certificates.
    *   [scripts/uninstall-certs.sh](file:///C:/Users/sahil/Desktop/Projects/dms-o2/scripts/uninstall-certs.sh) - Added Linux/macOS script to completely uninstall root CA from system trust store and delete all local certificates.
    *   [setup.ps1](file:///C:/Users/sahil/Desktop/Projects/dms-o2/setup.ps1) - Configured automatic detection of mTLS configuration, auto-generation of the `universal` client certificate and its installer scripts, and dynamic db healthcheck.
    *   [setup.sh](file:///C:/Users/sahil/Desktop/Projects/dms-o2/setup.sh) - Configured automatic detection of mTLS configuration, auto-generation of the `universal` client certificate and its installer scripts, and dynamic db healthcheck.
    *   [Makefile](file:///C:/Users/sahil/Desktop/Projects/dms-o2/Makefile) - Added `uninstall-certs` target to automate certificate cleanup.
    *   [.gitignore](file:///C:/Users/sahil/Desktop/Projects/dms-o2/.gitignore) - Configured Git to exclude local `.p12` certificates and generated client `-INSTRUCTIONS.txt` and installer scripts.
*   **Documentation Updated**: `.dev/changelog-dev.md`, [README.md](file:///C:/Users/sahil/Desktop/Projects/dms-o2/README.md)
*   **Testing Performed**: Successfully executed `generate-client-cert.bat toolroom` which generated valid `.pem`, `-key.pem`, and `.p12` certificates, automated installers, and instructions inside the certs/ directory.

### 2026-07-24 Â· Resolve Multi-Select Session Expiration & Implement Die Size-Sorting inside Toolsets
*   **Feature**: Resolved issue where multi-select / bulk active sessions revoking did not evict tokens from Redis cache (resulting in revoked sessions remaining active in Redis), stringified payload body in bulk delete frontend requests to prevent JSON parser failures, and implemented interactive die size sorting (largest to smallest, smallest to largest, or default) for dies listed inside set detail views.
*   **Affected Modules**: `backend`, `frontend`
*   **Files Modified**:
    *   [profile.py](file:///D:/DMS/dms-o2/backend/users/views/profile.py) - Updated `destroy_bulk` and `destroy_all` actions to evict token hashes from Redis cache on database delete.
    *   [test_auth.py](file:///D:/DMS/dms-o2/backend/users/tests/test_auth.py) - Added unit tests validating cache eviction on bulk termination and clear-all operations.
    *   [ActiveSessionsList.tsx](file:///D:/DMS/dms-o2/frontend/src/pages/users/ActiveSessionsList.tsx) - Corrected request payload parameter structure by calling JSON.stringify.
    *   [InventorySubViews.tsx](file:///D:/DMS/dms-o2/frontend/src/features/inventory/components/InventorySubViews.tsx) - Added sizeSort state hook, diameter/width parser utility, and sort order selector button in SetView.
*   **Testing Performed**: Verified with production build checks, frontend Vitest checks, and Django unit test suites (all checks passed successfully).

### 2026-07-24 Â· Complete UI/UX Redesign of the Die Inventory Section
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

### 2026-07-24 Â· Complete UI/UX Redesign of the Users Admin Suite
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

### 2026-07-23 Â· Advanced 3D Stress Visualizer, Granular Access Tree & Live Auth Sync (v1.9.2)

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

### 2026-07-22 Â· Fix Search Size Precision & Dimension Relevance Scoring
*   **Feature**: Fixed false-positive size search results by replacing arbitrary string substring matching on numeric dimension fields (`CurrentSize`, `CurrentWidth`, `CurrentThickness`) with exact/prefix dimension matching, normalized `"mm"` unit suffixes for float parsing, enforced score > 50 filter on digit queries for Meilisearch hits, and updated PostgreSQL direct query builder `buildWhereClauses` to use prefix matching (`cleanQ%`) on numeric fields.
*   **Affected Modules**: `go-api`
*   **Files Modified**:
    *   [handlers.go](file:///D:/DMS/dms-o2/go-api/internal/handlers/handlers.go)
    *   [database.go](file:///D:/DMS/dms-o2/go-api/internal/database/database.go)
    *   [handlers_test.go](file:///D:/DMS/dms-o2/go-api/internal/handlers/handlers_test.go)
*   **Documentation Updated**: `.dev/architecture/coding-standards.md`, `.dev/modules/go-api.md`, `CHANGELOG.md`
*   **Testing Performed**: Ran Go test suite successfully (`go test ./...` in `go-api`), verified 100% test pass including new unit test cases.

### 2026-07-19 Â· Phase 1 Security Upgrades
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

### 2026-07-19 Â· Phase 2, 3 & 4 Upgrades (Schema Hardening, Database Consolidation & Wear Forecasting)
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

### 2026-07-20 Â· Phase 5: Observability, DX & Infrastructure Upgrades
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

### 2026-07-22 Â· Phase 6: Security Hardening & Infrastructure Resilience
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

### 2026-07-22 Â· Location Grid & Physical Schema (Roadmap Phase 2)
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

### 2026-07-22 Â· Engineering Operating System Implementation
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

### 2026-07-27 Â· Phase 2 â€“ Performance Optimization (Tools Suite Refactoring)
*   **Feature**: Implement SWR caching for Go Stats API and React bundle component-level code-splitting.
*   **Affected Modules**: `go-api`, `frontend`
*   **Files Modified/Created**:
    *   [handlers.go](file:///D:/DMS/dms-o2/go-api/internal/handlers/handlers.go) - Updated `HandleStats` to implement Stale-While-Revalidate pattern using `stats:fresh` lock-key and async background DB refreshes.
    *   [cache.go](file:///D:/DMS/dms-o2/go-api/internal/cache/cache.go) - Modified `Invalidate()` to delete `stats:fresh` instead of deleting `stats` data, keeping stale data cached for instant return.
    *   [cache_test.go](file:///D:/DMS/dms-o2/go-api/internal/cache/cache_test.go) - Updated `TestInvalidate` to verify `stats:fresh` key deletion.
    *   [handlers_test.go](file:///D:/DMS/dms-o2/go-api/internal/handlers/handlers_test.go) - Updated existing stats handler unit tests and added `TestHandleStats_StaleRevalidate` to test full async revalidation.
    *   [WireDrawingCalculatorPage.tsx](file:///D:/DMS/dms-o2/frontend/src/pages/WireDrawingCalculatorPage.tsx) - Lazy-loaded charts (`ElongationChart`, `AreaReductionChart`), 3D stress visualizer (`StressHeatmap3D`), CAD blueprinter (`DieBlueprint`), and `TheoryPanel` with custom premium loader skeletons. Fully restored the original `useUndo` hooks, properties (e.g. `onParse`, `currentDies` to `InputPanel`), global shortcuts, and resolved a runtime index accessor ReferenceError.
    *   [DieDetailPage.tsx](file:///D:/DMS/dms-o2/frontend/src/features/inventory/components/DieDetailPage.tsx) - Lazy-loaded the CAD `DieBlueprint` renderer with a suspense skeleton block.
*   **Testing Performed**: AST graph updated successfully via Graphify. Verified code structures manually.
*   **Documentation Updated**: `.dev/changelog-dev.md`, `.dev/state/active-task.md`



### 2026-07-31 A– Codebase Refactor: Go, Django, Frontend Cleanup
*   **Feature**: Production-quality refactor across all three tiers. Deduplicated repeated Go handler/database logic, removed unused Django imports and duplicated settings guards, and removed ~155 occurrences of dead (silently-ignored) Tailwind classes. All changes behavior-neutral; public APIs and DB schemas untouched.
*   **Affected Modules**: go-api, ackend, rontend
*   **Files Modified/Created**:
    *   [go-api/internal/handlers/handlers.go](file:///D:/DMS/dms-o2/go-api/internal/handlers/handlers.go) - Extracted equirePost(w,r) helper; removed 6 duplicated POST method guards.
    *   [go-api/internal/database/database.go](file:///D:/DMS/dms-o2/go-api/internal/database/database.go) - Extracted ppendDimensionFilters helper; deduped size/width/thickness filter blocks.
    *   [go-api/cmd/server/main.go](file:///D:/DMS/dms-o2/go-api/cmd/server/main.go) - Removed redundant inline comments.
    *   [backend/users/middleware.py](file:///D:/DMS/dms-o2/backend/users/middleware.py) - Removed unused imports.
    *   [backend/machines/signals.py](file:///D:/DMS/dms-o2/backend/machines/signals.py) - Import from users.context instead of middleware re-export.
    *   [backend/dies/services/search_service.py](file:///D:/DMS/dms-o2/backend/dies/services/search_service.py) - Import _thread_locals from users.context.
    *   [backend/dms/settings.py](file:///D:/DMS/dms-o2/backend/dms/settings.py) - Removed duplicate SECRET_KEY guard, deduped import sys, removed redundant CORS header override, removed stale comments.
    *   [frontend/src/](file:///D:/DMS/dms-o2/frontend/src/) - 29 files: removed dead Tailwind classes (invalid scale stops, fractional spacing, non-standard durations/z-index).
*   **Documentation Updated**: .dev/state/active-task.md
*   **Testing Performed**: go vet/go build/go test ./... all pass (Go). py_compile clean on all edited Python files. 
px tsc --noEmit shows only pre-existing test/prop errors; eslint src 0 errors (467 pre-existing warnings). Deferred items: dms/urls.py legacy API aliases (frontend depends on them) and duplicate dialog/empty-state merge (user-canceled).
### 2026-07-31 A– Consolidate Testing-Mode Detection
*   **Feature**: Created dms/testing.py exposing IS_TESTING = 'test' in sys.argv. Replaced inline sys.argv sniffing in dms/settings.py (Redis test DB selection, Celery eager flag) and search/meili.py (test index selection) with a single shared constant.
*   **Affected Modules**: ackend
*   **Files Modified/Created**:
    *   [backend/dms/testing.py](file:///D:/DMS/dms-o2/backend/dms/testing.py) - New shared IS_TESTING constant.
    *   [backend/dms/settings.py](file:///D:/DMS/dms-o2/backend/dms/settings.py) - Import IS_TESTING; removed now-unused import sys.
    *   [backend/search/meili.py](file:///D:/DMS/dms-o2/backend/search/meili.py) - Import IS_TESTING for INDEX_NAME selection.
*   **Documentation Updated**: .dev/state/active-task.md
*   **Testing Performed**: py_compile clean on all edited files. No circular-import risk (dms.testing imports only sys).

### 2026-08-06 · Celery Beat Permission Fix & Database Volume Recovery
*   **Feature**: Fixed Celery Beat startup failure and PostgreSQL container password authentication mismatch.
*   **Affected Modules**: docker deployment, celery services
*   **Files Modified/Created**:
    *   [docker-compose.yml](file:///home/sahil/Desktop/Projects/dms-o2/docker-compose.yml) - Configured Celery beat service with `--schedule=/tmp/celerybeat-schedule` to resolve permissions issues in the bind-mounted host folder.
*   **Implementation Approach**:
    *   Identified `OperationalError: password authentication failed for user "dms_user"` in migrations container, caused by a stale database volume retaining previous credentials.
    *   Reset database volume (`docker compose down -v`) and initialized the environment using `setup.sh` to synchronize the container cluster with the new `.env` passwords.
    *   Identified that the Celery beat container was failing its health checks due to the scheduler database `celerybeat-schedule` being created in `/app` (which is bind-mounted to `./backend` on the host, preventing the non-root `dmsuser` from writing to it).
    *   Modified the Celery beat command to write the scheduler database file to `/tmp/celerybeat-schedule`, which is fully writable by `dmsuser`.
*   **Testing Performed**: Verified all Docker containers are Up and Healthy, including Celery beat and Django.