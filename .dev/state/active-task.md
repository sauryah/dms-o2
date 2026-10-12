# Active Task

## Purpose
Track current work item for AI sessions.
**Why:** Enable session continuity and task resumption.
**Read by:** AI agents.
**Updated:** Every session.

### Current Task
**Task:** High-Impact Codebase Quality & Stability Overhaul (Batches 1-3 Complete)
**Status:** Complete
**Started:** 2026-10-12
**Completed:** 2026-10-12
**Confidence:** 100%

## Task Description
Implement the highest-impact, evidence-backed fixes identified in the repository audit across stability, concurrency, outbox integrity, search consistency, and test health.

## Completed
- **Batch 1 (Calculation, Session, and Pagination Stability)**:
  - BUG-01: Go Wire Drawing finite/positive die size validation (`HandleCalculateWireDrawing`) + regression tests.
  - BUG-02: Session pruning explicit Redis token and user session eviction (`expire_sessions.py`) + regression test.
  - BUG-03: Unified History query integer parsing validation (`UnifiedHistoryListView`) + regression test suite.
  - LINT-01 & UI-02: Cleaned ESLint warning in `WireDrawingPrintReport.tsx` and removed forced uppercase in `MachineSidebarTree.tsx`.
  - Commit: `93e7850`.
- **Batch 2 (Data Integrity & Outbox Hardening)**:
  - ARC-01: Transactional outbox guarantees in `search_service.py` (`queue_die_sync` & `delete_die_document` creating `OutboxTask` inside primary transaction) + rollback/commit regression tests.
  - PERF-02: Single-save OCC version increment in `DieViewSet.update` (`serializer.save(version=locked_instance.version + 1)`) + regression test.
  - PERF-01: Decoupled outbox row claiming from Meilisearch HTTP calls in `process_outbox_task`.
  - BUG-04: Length-aware sequence ordering (`Length('doc_ref').desc(), '-doc_ref'`) for document IDs exceeding 9,999 + regression test.
  - Commit: `11a159b`.
- **Batch 3 (Search Consistency & Realtime Multiplexing)**:
  - BUG-05: Propagated `machine_id`, `set_id`, `unassigned`, and `location` to `QueryPostgresByIDs` during Meilisearch full-text queries + regression test.
  - PERF-03: Expanded SSE client channel buffer from 10 to 256 in `HandleEvents`.
  - TEST-01: Updated Playwright smoke test fixture with structured `{ rack, shelf_number }`.
  - Commit: `c95fe45`.
- **Senior Review & Regression Hardening**:
  - Restored at-least-once transactional outbox delivery guarantee in `backend/search/tasks.py`: bounded Meilisearch HTTP calls with 3000ms timeout within transaction rollback boundary so worker crashes or index failures never drop tasks as phantom-processed; moved Redis `broadcast_event(...)` calls outside transaction.
  - Resolved missing imports (`transaction`, `timezone`, `OutboxTask`) at module level in `backend/search/tasks.py`.
  - Routed relational foreign-key queries (`machine_id`, `set_id`, `unassigned`) directly to Postgres in `go-api/internal/handlers/handlers.go`, guaranteeing complete result sets, ILIKE search, and accurate `COUNT(*)` pagination without Meilisearch un-indexed relational truncation.
  - Preserved Meilisearch authoritative `totalHits` on general searches, eliminating artificial page-size truncation.
  - Updated Go regression test suite `TestQueryMeilisearchAndPostgres_RelationalFilterRoutesToPostgresDirect` and `TestQueryMeilisearchAndPostgres_LocationFilterPropagatedToMeilisearch`.

## Next Steps
- Maintain verified test baselines across all modules.

## Blockers
- None.


