# Django history Module (history.md)

## Purpose
Enforces auditable, immutable change ledgers: `DieHistory` and `MachineHistory`. Supports unified chronological audit timelines with field diff indicators.

## Important Files
- [models.py](file:///backend/history/models.py): Schema and triggers clear status hooks.
- [views.py](file:///backend/history/views.py): History timeline and unified history endpoints.
- [tasks.py](file:///backend/history/tasks.py): Retention pruning workers.

