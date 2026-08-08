# Active Task

## Purpose
Track current work item for AI sessions.
**Why:** Enable seamless session continuity and task resumption.
**Read by:** AI agents.
**Updated:** Every session.

## Current Task
**Task:** Die Set Planner Tool — Inventory Capacity Calculator
**Status:** Complete
**Started:** 2026-08-08
**Confidence:** 95%

## Task Description
Build a tool that calculates how many complete die sets can be produced from current
inventory: paste inventory + paste one die series → parse & validate → compute maximum
complete sets, bottleneck dies, missing dies, remaining stock, and unused inventory.

## Completed
1. **Go domain engine** (`go-api/internal/dieset/`) — isolated business-logic package:
   `NormalizeDieSize` (thousandths-integer keys so `0.620`, `.620`, `0.6200` compare equal
   without float equality), `FormatDieSize`, and `CalculateSeriesCapacity` computing
   `floor(available / requiredPerSet)` per die, the global minimum as maximum sets,
   bottleneck detection (`possibleSets == maximumSets`), missing-die + zero-quantity
   handling, used/remaining stock, and unused-inventory reporting. Table-driven tests
   cover basic, multi-die bottleneck, missing, zero-quantity, duplicate rows, decimal
   normalization, unused inventory, and invalid input.
2. **Go API endpoint** — `POST /api/go/tools/calculate/die-set` registered in
   `cmd/server/main.go`; `internal/handlers/handlers.go` `HandleCalculateDieSet` decodes
   the JSON payload, delegates to the `dieset` engine, and returns 422 with a friendly
   detail message on validation failure. Handler tests: valid 3-set calc, missing-die
   zero sets, invalid series 422, bad JSON 400, GET 405.
3. **Frontend feature** (`frontend/src/features/die-set-planner/`) — `domain/parsers.ts`
   (line-based spreadsheet/tab/space paste parsing, optional header-row skip,
   duplicate-aggregation warnings, lone-die-size rows treated as zero-quantity stock
   with a warning) with 17 Vitest tests; `types.ts`; `useDieSetPlanner` hook; `DieSetPlannerPage.tsx`
   (paste cards, Calculate button, loading/empty/error states, hero complete-set count,
   per-die breakdown table, bottleneck chips, missing + unused panels, Copy Result + Reset).
4. **Tool registration** — `App.tsx` route `/die-set-planner` guarded by
   `ProtectedRoute` with `toolId="die-set-planner"`; `ToolsPage.tsx` card; ROOT default
   tool lists in `AuthContext.tsx`; desktop + mobile `Navbar.tsx` links;
   `UserManager.tsx` permission toggle + badge label.
5. **Parser regression fix** — inventory parsing is now line-based: a die pasted with no
   quantity (blank sheet cell) becomes a zero-quantity stock row with an aggregated
   warning instead of stealing the next line's tokens as its quantity, which previously
   produced hundreds of false "invalid quantity" errors on real inventory pastes.

## Deferred / Explicitly Skipped
- **No persistence** — tool is stateless; calculations stay reproducible from pasted input.
- **Django backend** — calculation engine added to the Go API (aligned with existing
  `/api/go/tools/calculate/*` conventions) rather than a new Django module.

## Next Steps
- Optionally wire real inventory export (existing dies list) into the inventory paste box.

## Blockers
- Django test suite not runnable locally (global Python lacks DRF/psycopg/meili/decouple/
  celery; no venv). Verified via `py_compile` only.
- `tsc --noEmit` reports pre-existing errors in legacy test files (SessionTimeoutManager
  missing `refetchPermissions`, EmptyState/PageHeader/Skeleton/StatusBadge prop mismatches);
  new feature files are clean.
