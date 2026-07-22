# Django dies Module (dies.md)

## Purpose
Manages die entities (`Die`, `RoundDie`, `FlatDie`), tolerance limits (`DieTolerance`), wear alerts (`WearAlert`), and search indexing tasks (`OutboxTask`).

## Important Files
- [models.py](file:///home/sahil/Desktop/Projects/dms-o2/backend/dies/models.py): Schema definitions.
- [serializers.py](file:///home/sahil/Desktop/Projects/dms-o2/backend/dies/serializers.py): API serializers.
- [views.py](file:///home/sahil/Desktop/Projects/dms-o2/backend/dies/views.py): API views.
- [search_service.py](file:///home/sahil/Desktop/Projects/dms-o2/backend/dies/services/search_service.py): Sync queues helper.
- [wear_prediction_service.py](file:///home/sahil/Desktop/Projects/dms-o2/backend/dies/services/wear_prediction_service.py): Linear wear calculations.
- [validation_service.py](file:///home/sahil/Desktop/Projects/dms-o2/backend/dies/services/validation_service.py): Input validation.

## Key Changes
- **Location Grid (2026-07-22)**: Migrated free-text `location` field to structured `rack` (FK) + `shelf_number` fields. Added validation to prevent assignment to non-existent layout spots.
