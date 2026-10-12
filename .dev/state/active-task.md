# Active Task

## Purpose
Track current work item for AI sessions.
**Why:** Enable session continuity and task resumption.
**Read by:** AI agents.
**Updated:** Every session.

### Current Task
**Task:** Data Integrity & Outbox Hardening (Batch 2: ARC-01, PERF-02, PERF-01, BUG-04)
**Status:** In Progress
**Started:** 2026-10-12
**Completed:** In Progress
**Confidence:** 100%

## Task Description
Implement the next highest-impact architectural and performance fixes:
1. **ARC-01 (`SearchService.queue_die_sync`, `delete_die_document`)**: Execute `OutboxTask.objects.create` inside the primary database transaction instead of `transaction.on_commit(run_sync)`. Use `on_commit` strictly to discard thread-local tracking and dispatch background workers.
2. **PERF-02 (`DieViewSet.update`)**: Consolidate version increment into a single atomic `save()` operation (`serializer.save(version=locked_instance.version + 1)`), eliminating double database writes, duplicate signal firings, and redundant outbox tasks.
3. **PERF-01 (`backend/search/tasks.py`)**: Decouple outbox row claiming from blocking Meilisearch HTTP requests and task polling, releasing row locks and returning connections to the pool immediately.
4. **BUG-04 (`backend/history/views.py`)**: Prevent document sequence sorting inversion when IDs exceed 4 digits by ordering by string length before lexical order (`Length('doc_ref').desc(), '-doc_ref'`).

## Completed
- Completed Batch 1: BUG-01, BUG-02, BUG-03, LINT-01, UI-02 with regression tests and clean frontend verification (95/95 tests passing, 0 TypeScript errors, 0 ESLint warnings, clean Vite production build).

## Next Steps
- Implement Batch 2 fixes in `search_service.py`, `views.py` (dies), `tasks.py` (search), and `views.py` (history).
- Add regression tests for transactional outbox, OCC single-save versioning, and document sequence generation past 9999.
- Verify regressions and compile checks.

## Blockers
- None.


