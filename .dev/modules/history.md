# Django history Module (history.md)

## Purpose
Enforces auditable, tamper-evident change ledgers: `DieHistory` and `MachineHistory`. Supports unified chronological audit timelines with field diff indicators and cryptographic hash chaining.

## Important Files
- [models.py](file:///backend/history/models.py): Schema definitions with automatic SHA-256 cryptographic chaining (`prev_hash` and `hash`) on save.
- [views.py](file:///backend/history/views.py): History timeline, dashboard activity list (`DashboardHistoryListView`), and unified history endpoints with caching.
- [serializers.py](file:///backend/history/serializers.py): Audit serializers for field transitions, user attribution, and hash verification.
- [signals.py](file:///backend/history/signals.py): Change hooks invalidating `dashboard_history_v1` Redis cache on model mutations.
- [tasks.py](file:///backend/history/tasks.py): Background maintenance and audit archive workers.

## Key Features
- **Cryptographic Hash Chaining**: Every `DieHistory` and `MachineHistory` record calculates a SHA-256 hash containing its mutation payload concatenated with the preceding record's hash (`prev_hash`). Any historical alteration or truncation breaks the cryptographic ledger chain.
- **Atomic Dashboard Cache Invalidation**: `DashboardHistoryListView` serves recent timeline events from Redis key `dashboard_history_v1`. All die/machine writes, recuts, or deletions invoke cache invalidation signals, guaranteeing immediate freshness.
- **Client IP Resolution**: Captures verified client IP addresses through `HTTP_X_FORWARDED_FOR` behind reverse proxies (`NUM_PROXIES = 1`), automatically ignoring internal Docker network bridge IPs (`172.16.0.0/12`).


