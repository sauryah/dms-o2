# Django dies Module (dies.md)

## Purpose
Manages die entities (`Die`, `RoundDie`, `FlatDie`), tolerance limits (`DieTolerance`), wear alerts (`WearAlert`), maintenance logs (`MaintenanceLog`), import logs (`ImportLog`), search indexing outbox tasks (`OutboxTask`), enamel machine stock allocations (`EnamelMachine`, `MachineDieStock`), and physical floor inventory recount audits (`DieInventoryRecount`, `DieInventoryRecountItem`).

## Important Files
- [models.py](file:///backend/dies/models.py): Schema definitions for dies, wear alerts, enamel machines, and recount audits.
- [serializers.py](file:///backend/dies/serializers.py): API serializers including recount sheet items and validation.
- [views.py](file:///backend/dies/views.py): REST API views and ViewSets for dies, recuts, enamel machine stocks, and recount submissions.
- [import_service.py](file:///backend/dies/services/import_service.py): Bulk import parser with in-memory rack and casing pre-caching.
- [recut_service.py](file:///backend/dies/services/recut_service.py): Atomic die recut processor with dimension validation and history logging.
- [search_service.py](file:///backend/dies/services/search_service.py): Meilisearch outbox sync queue dispatcher.
- [validation_service.py](file:///backend/dies/services/validation_service.py): Die dimensional and casing validation.
- [wear_alert_service.py](file:///backend/dies/services/wear_alert_service.py): Threshold wear alerting engine.

## Key Changes
- **Enamel Machine Stock & Physical Recount Audits (2026-09)**: Introduced `EnamelMachine` registry, live per-machine stock counters (`MachineDieStock`), and monthly physical audit reconciliation workflows (`DieInventoryRecount`, `DieInventoryRecountItem`) with atomic draft/submit states.
- **Bulk Import Pre-Caching (2026-09)**: Optimized Excel/CSV die imports by caching rack identifiers and casing records prior to row iterations, eliminating N+1 database queries.
- **Maintenance Status Extension (2026-08)**: Added `MAINTENANCE` status choice to `DIE_STATUSES` to distinguish dies undergoing workshop servicing from scrapped or damaged units.
- **Wear Prediction Decommissioning (2026-08-22)**: Removed linear regression wear prediction engine, `predicted_remaining_days` DB field, and `WearPredictionSection` UI to streamline core telemetry.
- **Location Grid (2026-07-22)**: Migrated free-text `location` field to structured `rack` (FK) + `shelf_number` fields. Added validation to prevent assignment to non-existent layout spots.
- **3D Stress & Theory Permissions (2026-07-23)**: Integrated sub-feature authorization checks for specialized calculation and visualization tooling.


