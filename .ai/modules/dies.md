# Django dies Module (dies.md)

## Purpose
Manages die entities (`Die`, `RoundDie`, `FlatDie`), tolerance limits (`DieTolerance`), wear alerts (`WearAlert`), and search indexing tasks (`OutboxTask`).

## Important Files
- [models.py](file:///home/sahil/Desktop/Projects/dms-o2/backend/dies/models.py): Schema definitions.
- [search_service.py](file:///home/sahil/Desktop/Projects/dms-o2/backend/dies/services/search_service.py): Sync queues helper.
- [wear_prediction_service.py](file:///home/sahil/Desktop/Projects/dms-o2/backend/dies/services/wear_prediction_service.py): Linear wear calculations.
