# Active Task

## Purpose
Track current work item for AI sessions.
**Why:** Enable seamless session continuity and task resumption.
**Read by:** AI agents.
**Updated:** Every session.

## Current Task
**Task:** Dark Terminal Design System & ROOT-Only Dual-Theme Switcher
**Status:** Complete
**Started:** 2026-08-14
**Completed:** 2026-08-14
**Confidence:** 100%

## Task Description
Overhaul the entire DMS-O2 frontend application to the "Dark Terminal / Bloomberg-Tape" visual design system across all 21 shared UI components and 15 page modules. Build a persistent Dual-Theme Switcher allowing instantaneous swapping between Dark Terminal and Classic Slate themes, strictly restricted to ROOT administrators. Maintain zero-error TypeScript type checks, zero lint errors, and 100% passing test suites.

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
   (client-side pre-check only; raw text is what the page sends), with 17 Vitest tests; `types.ts`;
   `useDieSetPlanner` hook; `DieSetPlannerPage.tsx`
   (paste cards, Calculate button, loading/empty/error states, hero complete-set count,
   per-die breakdown table, bottleneck chips, missing + unused panels, Copy Result + Reset).
4. **Tool registration** — `App.tsx` route `/die-set-planner` guarded by
   `ProtectedRoute` with `toolId="die-set-planner"`; `ToolsPage.tsx` card; ROOT default
   tool lists in `AuthContext.tsx`; desktop + mobile `Navbar.tsx` links;
   `UserManager.tsx` permission toggle + badge label.
5. **Parser regression fix + backend authority** — inventory parsing is line-based: a die pasted
   with no quantity (blank sheet cell) becomes a zero-quantity stock row with an aggregated warning
   instead of stealing the next line's tokens. ALL parsing/validation/math now lives in the Go
   engine (`go-api/internal/dieset/parser.go` + `engine.go`): the endpoint accepts raw
   `{inventory_text, series_text}` strings, and the frontend parser is an optional pre-check only.
6. **Procurement plan** — optional `target_sets` in the request body: the Go engine emits a
   `procurement` array listing exactly which die sizes to purchase and how many of each to reach
   the target when it exceeds current capacity (plus a "target already achievable" warning when it
   7. **Industrial parsing & fine-wire 5-decimal precision** — upgraded Go engine (`engine.go` & `parser.go`) to use a 100,000 multiplier (5 decimal places precision) so fine wire sizes like `0.0625` format without rounding errors; added unit label stripping (`mm`, `in`, `"`, `inch`, `inches`), European decimal comma conversion (`0,620`), Excel float quantity parsing (`4.0`), and target set upper limit safety check (`targetSets <= 1,000,000,000`).
8. **Live DMS inventory integration, CSV export & UX hardening** — added **Load Active Stock** action on `DieSetPlannerPage.tsx` pulling live dies directly from DMS database (`/api/go/search?limit=5000`), **Sample Data** button for 1-click testing, **Export CSV** for report downloads, breakdown table status filters (**All**, **Bottlenecks**, **Missing**, **OK**), size search input, and `Ctrl+Enter` shortcut.
9. **Full test suite pass & git commit** — Go test suite 100% green (`dieset` and `handlers`), `npx tsc --noEmit` 0 errors, Vitest suite 69/69 green, Vite production build clean, committed to branch `enamel-die-set-planner` (`53007fe`).
10. **Hardening, Unit Safety & Accessibility (2026-08-10)** — Implemented physical unit conversion (inches to mm) in backend & frontend parsers. Added active status filtering (`isDieActive`) when querying database stock. Implemented frontend target input validation, keyboard enter key submission, capacity explanation card, target assessment card, and connected inputs with `id`/`htmlFor` for accessibility. Full test suites pass green.
11. **Enamel Die Inventory & Recount Sheets (2026-08-10)** — Implemented machine-specific stock tracking (`MachineDieStock`) and monthly recount sheets (`DieInventoryRecount`, `DieInventoryRecountItem`) in Django. Added ViewSets, transaction-wrapped stock submission updates, and full Django API tests (4/4 tests passed). Refactored frontend `DieSetPlannerPage` to support tabs (Calculator, Live Machine Stock, Recount Sheets) with framer-motion animations, quick-load stock options, and spreadsheet-like modal auditors.

## Deferred / Explicitly Skipped
- **Django backend calculation** — calculation engine remains in the Go API (aligned with existing `/api/go/tools/calculate/*` conventions) while inventory storage and audit sheets are persisted in Django (Python), matching DMS-O2 split write/read architecture.

## Next Steps
- Maintain test coverage and documentation integrity across ledgers.

## Blockers
- None. All test suites (`go test`, `django test`, `vitest`, `tsc`, `vite build`) pass cleanly.
