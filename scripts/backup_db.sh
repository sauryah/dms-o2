#!/bin/sh
set -e

BACKUP_DIR="/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/dms_backup_${TIMESTAMP}.dump"

echo "=== Starting Database Backup (Custom Format) ==="
mkdir -p "$BACKUP_DIR"

# Perform compressed custom-format pg_dump
PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -F c -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$BACKUP_FILE"

echo ">>> Backup saved to: $BACKUP_FILE"

# Delete backups older than 14 days
echo ">>> Pruning backups older than 14 days..."
find "$BACKUP_DIR" -type f -name "dms_backup_*.dump" -mtime +14 -delete

echo "=== Backup Completed Successfully ==="
