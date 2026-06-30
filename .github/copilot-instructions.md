# Copilot instructions for DMS

## Commands

### Frontend (`frontend/`)
- Install deps: `cd frontend && npm install`
- Dev server: `cd frontend && npm run dev`
- Build: `cd frontend && npm run build`
- Lint: `cd frontend && npm run lint`
- Unit tests: `cd frontend && npm run test`
- Single unit test file: `cd frontend && npm run test -- src/features/inventory/components/InventoryPage.test.tsx`
- E2E tests: `cd frontend && npm run test:e2e`

### Backend (`backend/`)
- Schema check: `cd backend && python manage.py makemigrations --check --dry-run`
- Run migrations: `cd backend && python manage.py migrate`
- Test suite: `cd backend && python manage.py test`
- Single test: `cd backend && python manage.py test dies.tests.test_api.DieAPITests.test_list_dies`

### Go API (`go-api/`)
- Test suite: `cd go-api && go test ./...`
- Single test: `cd go-api && go test ./internal/handlers -run TestHandleSearch_DirectPostgres -v`

### Full stack
- Local stack: `./setup.sh`
- Compose build/run: `docker compose up -d --build`

## Architecture

- PostgreSQL is the source of truth. Django owns CRUD, auth, RBAC, imports, backups, audit history, health checks, and SSE ticket issuance.
- `go-api/` is a separate read-optimized service for authenticated search, stats, index status, and SSE forwarding. It queries PostgreSQL directly, uses Meilisearch for fuzzy matching, and Redis for cache/invalidation.
- `frontend/` is a React + Vite SPA using `HashRouter`, React Query, and lazily loaded pages. It consumes the Django API through `useApi()` and listens for real-time events after exchanging a JWT for an SSE ticket.
- Search/index sync is event-driven: Django model signals and `transaction.on_commit` hooks queue Celery/search work, and PostgreSQL notifications trigger cache invalidation and UI updates.

## Where to look first

- `README.md` and `PROJECT.md` for the high-level system model and current delivery direction.
- `docs/ARCHITECTURE.md` for API contracts, auth flow, and the Django/Go service split.
- `backend/dms/settings.py` and `backend/dms/urls.py` for runtime config and endpoint wiring.
- `frontend/src/App.tsx` for route structure, auth gating, SSE handling, and global app behavior.
- `go-api/cmd/server/main.go` plus `go-api/internal/handlers/` for search, stats, and event endpoints.

## Conventions

- Roles are `ROOT`, `ADMIN`, `OPERATOR`, and `REGULAR`. Frontend guards and backend permissions must stay aligned.
- Dies are modeled as a discriminated union by `die_type` (`ROUND` or `FLAT`). Keep frontend validation in `frontend/src/types/validation.ts` consistent with backend serializers/models.
- Historical audit rows are immutable. Create `DieHistory` entries only through the existing signals/triggers flow, not manually.
- Operator writes are intentionally narrow: PATCH is limited to `location`, `rack`, and `shelf`.
- Use `useApi()` for browser requests so auth headers, 401 handling, JSON error parsing, and retries stay consistent.
- Keep side effects inside `transaction.on_commit` when they depend on persisted data or need to fan out to search/cache/event systems.
- Frontend page code is typically lazy-loaded and wrapped in `ErrorBoundary` plus `ProtectedRoute`; keep new private routes consistent with that pattern.
- Django viewsets here are thin orchestration layers; keep validation, normalization, and business rules in serializers, services, signals, or management commands.
- `backend/dies/signals.py` is the canonical place for die history, search sync, and delete broadcasts; avoid duplicating that logic in views or serializers.
- User updates are intentionally constrained: changing email/password requires `current_password`, and the API blocks assigning `ROOT` through normal CRUD.
- Login issues JWTs plus a `UserSession` row; authentication is session-backed, single-device by default, and enforced through `CustomJWTAuthentication` on every request.
- Keep auth endpoints aligned with existing semantics: `login`, `me`, `change-password`, `keep-alive`, `sse-ticket`, and `verify-token` already have established response shapes and permission boundaries.
- Session eviction is intentional. New logins may prune older sessions, and stale or replaced tokens must fail fast with 401s rather than being silently accepted.
- Permission checks are role-specific and layered: public read access is allowed for some resources, but write access is tightly scoped by `IsAdminOrRoot`, `IsRootOnly`, and `IsAdminOrRootOrOperatorRelocate`.
- The inventory page relies on optimistic React Query updates and named query keys like `['dies']`, `['searchDies']`, `['machinesList']`, and `['setsDropdownList']`; reuse those keys when adding new mutations or invalidations.
- The frontend expects authenticated search responses to preserve metadata when `keepMetadata: true` is set, because the inventory UI reads both `results` and `total`.
- The frontend uses hash routing, lazy-loaded pages, and role-based nav items; keep new pages wired through `App.tsx`, `Navbar`, and `ProtectedRoute` instead of bypassing the router.
- Prefetches and query keys are part of perceived performance. Keep dashboard/inventory/machines prefetch behavior and naming aligned with the existing `Navbar` and page queries.
- Notifications are persisted in `localStorage` under `dms_notifications` and capped at 20 items; preserve that behavior if you touch the notification flow.
- Command palette and other action surfaces rely on direct API mutations plus toast feedback; keep those actions using the shared request/toast helpers.
- SSE/event payloads are part of the app contract: keep `die_update`, `set_update`, `machine_update`, and `backup_update` actions stable unless you update the listeners with them.
- Sessions are single-device by design. JWT auth, Redis session cache, and `UserSession` cleanup all work together, so auth changes need to respect eviction and timeout behavior.
- Prefer updating both Django and Go when changing search behavior; the Go API handles search/query formatting while Django remains the source of record.
- Search responses from Go are shaped as `total`, `limit`, `offset`, and `results`; keep that shape stable because the frontend reads both pagination and counts.
- Frontend persistence uses the `dms_*` localStorage keys for token, role, username, user id, and notifications; preserve those keys when changing auth or notification flows.
- Operational backend entry points are management commands such as `create_root_user`, `sync_search`, `prune_history`, and `expire_sessions`; prefer those over ad hoc scripts for maintenance behavior.
- Go search handlers should keep cache keys stable (`stats`, `search:*`, `cached_searches`, `search_index_status`) and treat Redis as optional; the service must still respond cleanly if cache is unavailable.
- Search query building is centralized in `internal/database`; prefer extending those builders rather than assembling SQL in handlers.
- Go auth middleware validates JWTs locally, then confirms active sessions through Django and Redis cache. If you change auth flow, update both the middleware and the Django verification endpoint contract.
- SSE fan-out is handled by the Go event manager, which relays PostgreSQL notifications directly to connected clients. Keep event payload strings and queue behavior stable to avoid dropping clients.
- Deployment uses Docker Compose with distinct dev/prod files, a `migrate` bootstrap service, and Traefik routing. Keep service names, ports, and healthchecks aligned with `docker-compose*.yml`.
- `setup.sh` is the local bootstrap path; it creates `.env` if needed, brings up the stack, runs migrations, creates the root user, and syncs search.
- `deploy.sh` is the production upgrade path: pull, validate `.env`, build with `docker compose -f docker-compose.prod.yml`, start services, run `create_root_user`, then `sync_search`.
- `dms-backup.sh` controls backup/restore. Restore stops `django`, `worker`, and `go-api`, recreates the DB, restores the dump, restarts services, and re-runs `sync_search`.
- The backup container also runs scheduled `backup_db.sh` and `prune_history.sh`; don’t duplicate those cron jobs elsewhere.
- Production Compose expects `migrate` to finish successfully before `django` starts; don’t change that dependency chain without updating the bootstrap flow.
- Keep the published ports and routing stable: Django on `8000`, Go API on `8080`, frontend on `80` in prod and `3000` in dev, with Traefik owning external entrypoints.
- `docker-compose.yml` uses `redis` and `meilisearch` as internal service names, and the Go API expects `REDIS_HOST=redis` plus Django verification at `/internal/verify-token/`.
