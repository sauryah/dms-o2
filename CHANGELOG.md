# Changelog

All notable changes to the DMS project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [1.4.0] - 2026-07-10

### Added
- Standard community files: `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `SUPPORT.md`.
- Issue templates for bug reports and feature requests.
- Pull request template.
- Cookie-based JWT authentication fallback utilizing HTTPOnly cookies (`dms_access_token` and `dms_refresh_token`).
- Internal token verification security via `X-Internal-Key` and `INTERNAL_API_SECRET` checking between the Go search service and Django.
- Fallback unit test coverage for Go API handlers.

### Changed
- Replaced the proprietary license with the open-source MIT License.
- Updated absolute references in documentation to point to local workspace paths.
- Refactored `README.md`, `PROJECT.md`, `MASTER.md`, and `docs/ARCHITECTURE.md` to be concise, professional, and beginner-friendly.
- Refactored and decomposed the monolithic frontend `InventoryPage.tsx` into a custom state hook (`useInventoryState.ts`) and separate sub-components (`InventorySubViews.tsx`).
- Hardened token refresh logic to automatically sync active user sessions and clear outdated Redis cache keys.

### Fixed
- Stabilized and resolved all backend Django and frontend Vitest unit test failures.
- Fixed cookie cleanup during logout operations.


---

## [1.3.0] - 2026-06-30

### Fixed
- Fixed privilege escalation vulnerability in UserSerializer, blocking self-role updates for non-ROOT users.
- Prevented ROOT users from self-demoting or self-deactivating.
- Fixed NameError runtime crashes in BackupViewSet backup download and delete actions.
- Extended database pruning script prune_history.sh to prune the MachineHistory table.
- Optimized Go search microservice by avoiding parallel database direct query scans when Meilisearch is active (fallback-only).
- Configured connection maximum lifetime and idle connection limits in Go DB connection pool.
- Disabled Django global ATOMIC_REQUESTS to prevent test suite transaction contamination, and decorated serializer writes with explicit atomic transaction wrappers.
- Added aria attributes accessibility support to the DiesTable virtualized list rows.

---

## [1.2.0] - 2026-06-25

### Refactored
- Optimized Go API caching by replacing cursor-based `SCAN` keys iteration with a Redis Set (`cached_searches`) tracking list, reducing invalidation complexity.
- Secured Django `ImportService` thread-local variables (`user`, `skip_single_sync`) lifecycle management by wrapping the execution loop in a `try...finally` block.
- Modularized React frontend `UsersPage` into separate `UserManager` and `BackupManager` components.
- Modularized React frontend `MachineSetsPage` into separate `CategoriesTab`, `MachinesTab`, and `SetsTab` components.

---

## [1.1.0] - 2026-06-24

### Added
- Added custom `limit` parameter to Go API `/api/go/search` endpoint (default: 150).
- Configured frontend React Query prefetching to use `limit=10000` to fetch and render the complete tree.
- Implemented cache-first authentication lookups and throttled updates for `last_seen` in CustomJWTAuthentication.
- Enforced password strength validation in UserSerializer.
- Allowed self-profile updates for non-root users in IsRootOnly.
- Added client-side ProtectedRoute routing security.
- Developed an interactive HTML5 drag-and-drop Rack Grid Layout.
- Developed keyboard navigation support in the search dropdown (ArrowUp, ArrowDown, Enter).
- Added bidirectional CAD blueprint vector and specifications table highlighting.

---

## [1.0.0] - 2026-06-15

### Added
- High-performance Go search API microservice with custom Postgres ANY array parsing.
- Real-time status synchronization using PostgreSQL `LISTEN`/`NOTIFY` and Server-Sent Events (SSE).
- Automatic database backups nightly at 2:00 AM.
- Excel spreadsheet bulk imports.
- Concurrent user session eviction.
- Production deployment configuration with Traefik, Gunicorn, and Nginx.
