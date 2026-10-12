# Active Task

## Purpose
Track current work item for AI sessions.
**Why:** Enable session continuity and task resumption.
**Read by:** AI agents.
**Updated:** Every session.

### Current Task
**Task:** Search Consistency & Realtime Multiplexing (Batch 3: BUG-05, PERF-03, TEST-01)
**Status:** In Progress
**Started:** 2026-10-12
**Completed:** In Progress
**Confidence:** 100%

## Task Description
Implement search consistency, realtime multiplexing, and test fixtures:
1. **BUG-05 (`go-api/internal/handlers/handlers.go`)**: Include `machine_id`, `set_id`, and `unassigned` filters in the Meilisearch query payload (`QueryMeilisearchAndPostgres`), matching the Postgres direct query filter behavior.
2. **PERF-03 (`go-api/internal/handlers/handlers.go`)**: Expand SSE client channel buffer from 10 to 256 in `HandleEvents` to prevent slow-client disconnects during high-throughput batch operations.
3. **TEST-01 (`frontend/tests/e2e/smoke.spec.js`)**: Update E2E smoke tests to supply structured `{ rack, shelf_number }` rather than deprecated free-text `location`.

## Completed
- Completed Batch 1: BUG-01, BUG-02, BUG-03, LINT-01, UI-02 with regression tests and clean frontend verification (95/95 tests passing, 0 TypeScript errors, 0 ESLint warnings, clean Vite production build). Commit: `93e7850`.
- Completed Batch 2: ARC-01, PERF-02, PERF-01, BUG-04 with regression tests across `test_search.py`, `test_api.py`, and `test_views.py`, plus full bytecode compilation.

## Next Steps
- Implement Batch 3 fixes in `go-api/internal/handlers/handlers.go` and `frontend/tests/e2e/smoke.spec.js`.
- Add regression tests in `go-api/internal/handlers/handlers_test.go`.
- Run frontend and Go test suites and verify baselines.

## Blockers
- None.


