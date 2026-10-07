# Django machines Module (machines.md)

## Purpose
Manages physical floor organizational divisions and storage grids: `MachineCategory`, `Machine`, `Set`, and `Rack`.

## Important Files
- [models.py](file:///backend/machines/models.py): Asset and rack layout models (`MachineCategory`, `Machine`, `Set`, `Rack`).
- [views/](file:///backend/machines/views/): ViewSet modules:
  - `category.py`: `MachineCategoryViewSet`
  - `machine.py`: `MachineViewSet`
  - `rack.py`: `RackViewSet`
  - `set.py`: `SetViewSet` (handles machine set allocations and die assignments)
- [signals.py](file:///backend/machines/signals.py): Audit logging signals tracking machine layout modifications to `MachineHistory`.

