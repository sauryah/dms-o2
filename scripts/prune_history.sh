#!/bin/sh
set -e

RETENTION_DAYS=${HISTORY_RETENTION_DAYS:-365}
echo "=== Starting DieHistory Pruning (Retention: ${RETENTION_DAYS} days) ==="

# Execute SQL query on PostgreSQL database to prune old DieHistory and MachineHistory records
RESULT_DIE=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -A -c "
WITH deleted AS (
    DELETE FROM history_diehistory 
    WHERE timestamp < NOW() - INTERVAL '${RETENTION_DAYS} days' 
    RETURNING id
)
SELECT COUNT(*) FROM deleted;
")

RESULT_MACH=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -A -c "
WITH deleted AS (
    DELETE FROM history_machinehistory 
    WHERE timestamp < NOW() - INTERVAL '${RETENTION_DAYS} days' 
    RETURNING id
)
SELECT COUNT(*) FROM deleted;
")

echo "Pruned ${RESULT_DIE} DieHistory records and ${RESULT_MACH} MachineHistory records older than ${RETENTION_DAYS} days."
echo "=== History Pruning Completed Successfully ==="
