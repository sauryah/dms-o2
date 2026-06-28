#!/bin/sh
set -e

RETENTION_DAYS=${HISTORY_RETENTION_DAYS:-365}
echo "=== Starting DieHistory Pruning (Retention: ${RETENTION_DAYS} days) ==="

# Execute SQL query on PostgreSQL database to prune old DieHistory records
RESULT=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -A -c "
WITH deleted AS (
    DELETE FROM history_diehistory 
    WHERE timestamp < NOW() - INTERVAL '${RETENTION_DAYS} days' 
    RETURNING id
)
SELECT COUNT(*) FROM deleted;
")

echo "Pruned ${RESULT} records older than ${RETENTION_DAYS} days."
echo "=== History Pruning Completed Successfully ==="
