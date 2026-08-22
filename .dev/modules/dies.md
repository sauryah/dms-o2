# Django dies Module (dies.md)

## Purpose
Manages die entities (`Die`, `RoundDie`, `FlatDie`), tolerance limits (`DieTolerance`), wear alerts (`WearAlert`), maintenance logs (`MaintenanceLog`), import logs (`ImportLog`), and search indexing outbox tasks (`OutboxTask`).

## Important Files
- [models.py](file:///backend/dies/models.py): Schema definitions.
- [serializers.py](file:///backend/dies/serializers.py): API serializers.
- [views.py](file:///backend/dies/views.py): API views.
- [search_service.py](file:///backend/dies/services/search_service.py): Sync queues helper.
- [validation_service.py](file:///backend/dies/services/validation_service.py): Input validation.
- [wear_alert_service.py](file:///backend/dies/services/wear_alert_service.py): Threshold wear alerting engine.

## Key Changes
- **Wear Prediction Decommissioning (2026-08-22)**: Removed linear regression wear prediction engine, `predicted_remaining_days` DB field, and `WearPredictionSection` UI to streamline core telemetry.
- **Location Grid (2026-07-22)**: Migrated free-text `location` field to structured `rack` (FK) + `shelf_number` fields. Added validation to prevent assignment to non-existent layout spots.
- **3D Stress & Theory Permissions (2026-07-23)**: Integrated sub-feature authorization checks for specialized calculation and visualization tooling.

