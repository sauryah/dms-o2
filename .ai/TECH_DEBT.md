# Technical Debt Log (TECH_DEBT.md)

This log documents code areas requiring refactoring, scale constraints, or architecture cleanups.

---

## 1. Inventory Explorer Sidebar Grouping Scale Limit
*   **Location**: [useInventoryState.ts](file:///home/sahil/Desktop/Projects/dms-o2/frontend/src/features/inventory/hooks/useInventoryState.ts)
*   **Description**: The frontend requests up to 100k dies (`limit=100000`) and groups them into Sets and Machines in browser memory.
*   **Impact**: While `react-window` handles table rendering smoothly, downloading, storing, and parsing large arrays in the browser will degrade performance if the inventory exceeds 100,000 dies.
*   **Refactor Plan**: Build a paginated backend grouping endpoint that returns parent IDs and children counts dynamically.

---

## 2. Redundant Backup & Pruner Shell Scripts
*   **Location**: `scripts/backup_db.sh`, `scripts/prune_history.sh` vs `BackupService.py`, `history/tasks.py`
*   **Description**: The backup/restore and history pruning logic is implemented twice: once in Python (for Celery tasks) and once in bash (for container crons).
*   **Impact**: Any changes to backup verify rules or history pruning intervals must be updated in both places.
*   **Refactor Plan**: Consolidate these scripts by having the bash scripts call the Django management commands (`sync_search`, `prune_history`, `expire_sessions`) directly.

---

## 3. Manual Transaction Wrappers Invariant
*   **Location**: Backend API serializers/services mutations
*   **Description**: Global `ATOMIC_REQUESTS` is disabled during test runs to prevent transaction boundary pollution. As a result, developers must manually annotate mutating views/serializers with `with transaction.atomic()`.
*   **Impact**: If a developer forgets to add the atomic block, a database failure during an API call might result in partial commits.
*   **Refactor Plan**: Set up a test suite checker that intercepts write views and validates they run inside transactions.

---

## 4. String Decimal Conversions
*   **Location**: `serializers.py` and `database.go`
*   **Description**: PostgreSQL decimals are serialized as strings in Django REST API responses, then parsed into floats in the Go API and JS client.
*   **Impact**: Converts decimal types to strings to prevent float rounding errors, but introduces serialization overhead in Go search calculations.
