# Enterprise Roadmap & Phases (roadmap.md)

## Phase 1: Security & Service Boundaries (Completed)
- Go auth verification cached for 5 minutes.
- Logout evicts Go verification cache key directly.
- OutboxTask payload signed using SHA-256 HMAC signatures.
- Go startup validation checks for insecure development secrets.
- Redis AOF persistence enabled.
- Docker resource limits applied to all services.

## Phase 2: Location Grid & Physical Schema (Completed)
- Migrated free-text `Die.location` to structured `rack` (FK) + `shelf_number`.
- Validation prevents assignment to non-existent layout spots.
- API endpoints updated to use rack_id/shelf_number filters.

## Phase 3: Wear Alert Automation & Physical Auditing (Completed)
- DieTolerance and WearAlert models implemented with configurable thresholds.
- Background validation on die post-save signals and Celery Beat checks.
- Wear alerts exposed via API (`/api/v1/tolerances/`, `/api/v1/wear-alerts/`).
- Enamel Machine Stock allocation and monthly physical recount reconciliation sheets (`DieInventoryRecount`).
- **Decommissioned**: Predictive ML linear regression wear forecasting was formally decommissioned in favor of deterministic threshold alerting and physical recount verification.

## Phase 4: High-Performance Engine & Air-Gapped Operations (Completed)
- **v2.0.0**:
  - Rust / WebAssembly High-Resolution FEA Solver (`wasm-drawing-engine`) with sub-millisecond client simulation.
  - Single-use hashed backup recovery codes MFA (`UserBackupCode`) with session eviction on role modifications.
  - Cryptographic tamper-evident hash chaining on `DieHistory` and `MachineHistory`.
  - Atomic $O(1)$ search cache invalidation via Redis generation counter (`search_cache_gen`).
- **v2.1.0**:
  - Technical Data Sheet (TDS) ISO/DIN vector print reporting engine (`WireDrawingPrintReport.tsx`) with drafting schematic pipelines and area-reduction/elongation pass curves.
  - `PrintRecord` compliance audit logging (`history_printrecord`) with sequential reference tracking (`TDS-YYYYMMDD-XXXX`), unified history feed (`/api/v1/history/unified/`), and "PRINT LOGS" UI tab.
  - Production print layout isolation (`@page { margin: 8mm }`, `@media print` URL/date suppression, SVG chart right-gutter geometry fix).
  - Automatic descending series sorting in set detail views (big size to small size).
  - 100% self-hosted typography (`Inter` & `Plus Jakarta Sans` local WOFF2) and full telemetry de-Sentrying.
  - Factory LAN zero-configuration deployment (`toolroom.local`, `DMS-Client-Setup.exe`, dynamic private subnet matcher).

