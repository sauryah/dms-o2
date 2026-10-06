# Active Task

## Purpose
Track current work item for AI sessions.
**Why:** Enable session continuity and task resumption.
**Read by:** AI agents.
**Updated:** Every session.

### Current Task
**Task:** Full-Stack Codebase Audit & Documentation Synchronization (v2.1.0)
**Status:** Complete
**Started:** 2026-10-06
**Completed:** 2026-10-06
**Confidence:** 100%

## Task Description
Executed exhaustive audit of all project documentation against the active codebase implementation:
1. **Root Documentation (`README.md`, `PROJECT.md`, `CHANGELOG.md`)**:
   - Replaced obsolete tools (Die Set Planner, Sizing Calculator, Pass Optimizer, wear prediction) with current active tool suite.
   - Documented Wire Drawing 3D Workbench with Rust/Wasm high-resolution FEA engine (`wasm-drawing-engine`).
   - Documented Technical Data Sheet (TDS) vector reporting engine (`WireDrawingPrintReport.tsx`) with drafting pipelines and pass curves.
   - Documented automatic descending series sorting in set detail views (big to small).
   - Documented single-use recovery backup codes MFA (`UserBackupCode`), session eviction on role modifications, and reverse proxy IP attribution.
   - Documented 100% self-hosted local typography (zero Google Fonts, zero Sentry) and LAN deployment tooling (`DMS-Client-Setup.exe`).
   - Added release `[2.1.0] - 2026-10-06` to changelog.
2. **Architecture & Upgrade Docs (`docs/ARCHITECTURE.md`, `wiki/Upgrade-Guide.md`)**:
   - Aligned endpoint permission matrices (safe method auth enforcement returning 401).
   - Added Go calculation tools (`/wire-drawing`, `/die-series`).
   - Replaced old Redis pattern invalidation with $O(1)$ atomic generation counter `search_cache_gen`.
   - Updated upgrade guide to v2.1.0 target with backup codes migration and font asset cache bumping (`dms-static-v4`).
3. **Architecture Specifications (`.dev/architecture/*`)**:
   - `api.md`: Added backup codes MFA routes, recount audit sheets, machine stock endpoints, Go calculation tools, and `/api/go/metrics`.
   - `database.md`: Added `EnamelMachine`, `MachineDieStock`, `DieInventoryRecount`, `DieInventoryRecountItem`, `UserBackupCode`, and cryptographic hash chaining (`prev_hash`, `hash`) on `DieHistory`/`MachineHistory`.
   - `security.md`: Replaced TOTP with Single-Use Backup Codes, documented role-change session eviction, reverse proxy IP resolution (`NUM_PROXIES = 1`), and depleted code login blocking (403).
   - `decisions.md`: Documented ADR 8 through ADR 13.
   - `observability.md`: Documented `/api/go/metrics`, Prometheus alerts, and air-gapped local health probes.
4. **Module Documentation (`.dev/modules/*`)**:
   - `backend.md`: Updated `Die` model (`MAINTENANCE` status, removed wear prediction), added enamel/recount/backup models and recount reconciliation flow.
   - `dies.md`: Documented `EnamelMachine`, `MachineDieStock`, `DieInventoryRecount`, and bulk import pre-caching.
   - `frontend.md`: Removed decommissioned tools, documented Rust/Wasm FEA solver, TDS vector print engine, set series auto-sorting, and Rollup `manualChunks`.
   - `go-api.md`: Corrected file paths, removed `dieset/` parser references, documented calculation tools and $O(1)$ generation caching.
   - `users.md`: Documented `UserBackupCode`, session eviction, safe method auth, and `reset_mfa` CLI command.
   - `history.md`: Documented cryptographic SHA-256 hash chaining and atomic dashboard cache invalidation.
5. **Business Roadmap (`.dev/business/roadmap.md`)**:
   - Noted formal decommissioning of predictive ML wear forecasting in favor of deterministic threshold alerts and physical recount verification.
   - Recorded completion of Phase 4 and releases v2.0.0 & v2.1.0.

## Completed
- All 18 documentation files updated and verified against active source code.
- Strict "1 changed file = 1 commit" rule maintained with `--no-gpg-sign`.
- All unit and integration test suites passing, zero TypeScript errors.

## Next Steps
- Run `graphify update .` to synchronize knowledge graph.
- Push commits to remote origin if requested.

## Blockers
- None. Documentation is fully synchronized with implementation.
