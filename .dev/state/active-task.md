# Active Task

## Purpose
Track current work item for AI sessions.
**Why:** Enable seamless session continuity and task resumption.
**Read by:** AI agents.
**Updated:** Every session.

## Current Task
**Task:** Codebase refactor – Go, Django, frontend cleanup pass
**Status:** In Progress
**Started:** 2026-07-31
**Confidence:** 90%

## Task Description
Production-quality refactor across the three tiers. Audit first (complete), then implement
deduplication, dead-code removal, and convention fixes. Preserve behavior, public APIs,
DB schemas, and security properties. Verify after each change group.

## Completed
1. **Go (`go-api/`)** — `internal/handlers/handlers.go`: extracted `requirePost(w,r)`
   helper; removed 6 duplicated `"Only POST method is allowed"` guards (was lines 1082,
   1178, 1244, 1406, 1590, 1942). `internal/database/database.go`: extracted
   `appendDimensionFilters` helper; removed duplicated size/width/thickness filter blocks
   in `buildWhereClauses` and `QueryPostgresByIDs`. `cmd/server/main.go`: removed 10
   redundant inline comments. `gofmt` clean, `go vet`/`build`/`test` all pass.
2. **Django (`backend/`)** — `users/middleware.py`: removed unused imports
   (`get_current_user`, `get_current_ip`, `ipaddress`). `machines/signals.py` and
   `dies/services/search_service.py`: import `get_current_user`/`_thread_locals` from
   `users.context` (canonical) instead of `users.middleware` re-export.
   `dms/settings.py`: removed duplicate SECRET_KEY guard (was 15-17 vs 317-320), folded
   `not SECRET_KEY` check into consolidated guard; deduped `import sys` (was 217, 266);
   removed redundant `CORS_ALLOW_HEADERS` `x-requested-with` override (already in
   corsheaders `default_headers`); removed stale Phase-8 comments. All files `py_compile`
   clean.
3. **Frontend (`frontend/`)** — verified `tailwind.config.js` extends nothing (Tailwind
   3.4.1). Removed ~155 occurrences of dead Tailwind classes across 29 files (invalid
   scale stops `slate-805/850/855/905/750/605`, `rose-455/550/450`, `emerald-450`,
   `amber-450/655`, `blue-405/550/650`, `indigo-450/550/650/805`, `orange-350/450`,
   `placeholder-slate-505/550/650`, `z-45`, fractional spacing `px-4.5`/`py-4.5`/`p-4.5`/
   `gap-4.5`/`h-4.5`/`w-4.5`/`h-5.5`/`w-5.5`/`w-8.5`, `duration-250/350/550`). All
   were silently ignored (rendered nothing) — removal is behavior-neutral. `tsc --noEmit`
   shows only pre-existing test/prop errors; `eslint src` 0 errors (467 pre-existing
   warnings).

## Deferred / Explicitly Skipped
- **`dms/urls.py` legacy `api/` aliases** — NOT deduped. Frontend actively calls non-v1
  `api/auth/*`, `api/import/*`, `api/history/*`, `api/events/`; `/api/v1/` unused by
  frontend. Removing either set = public API change → escalate. Dual-path is intentional.
- **Duplicate ConfirmDialog/EmptyState merge** — canceled per user decision (high caller
  risk, user-visible).
- **`settings.py` LAN-IP auto-detect block** (was lines 21-31) — fragile but behavior-
  relevant; left untouched.
- **`'test' in sys.argv` sniffing** in `users/context.py`, `users/views/auth.py:39`,
  `search/meili.py:12` — not yet consolidated (settings.py instances deduped).

## Next Steps
- Consolidate remaining `'test' in sys.argv` sniffing into one helper.
- Update `.dev/changelog-dev.md`.
- Optional: address pre-existing tsc test-file errors (SessionTimeoutManager.test.tsx
  missing `refetchPermissions`, etc.).

## Blockers
- Django test suite not runnable locally (global Python 3.14 lacks DRF/psycopg/meili/
  decouple/celery; no venv; Django 6.0.7 global vs project 4.2.21). Verified via
  `py_compile` only.
- `tsc --noEmit` baseline not clean (pre-existing errors in test files and
  EmptyState/PageHeader/Skeleton/StatusBadge prop mismatches).
