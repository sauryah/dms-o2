#!/bin/sh
set -e

BACKUP_DIR="/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/dms_backup_${TIMESTAMP}.dump"

echo "=== Starting Database Backup (Custom Format) ==="
mkdir -p "$BACKUP_DIR"

# Perform compressed custom-format pg_dump
PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -F c -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$BACKUP_FILE"

# === Integrity & Verification Checks (Suggestion 2) ===
echo ">>> Running backup integrity and verification checks..."

# Check 1: File size must be greater than 5KB (empty pg_dumps are around 3KB)
FILE_SIZE=$(stat -c%s "$BACKUP_FILE" 2>/dev/null || stat -f%z "$BACKUP_FILE" 2>/dev/null || echo "0")
if [ "$FILE_SIZE" -lt 5120 ]; then
    echo "ERROR: Backup file is too small ($FILE_SIZE bytes). It may be corrupt or empty."
    rm -f "$BACKUP_FILE"
    exit 1
fi

# Check 2: Try to list headers using pg_restore to ensure structure is valid
if ! PGPASSWORD="$POSTGRES_PASSWORD" pg_restore -l "$BACKUP_FILE" >/dev/null 2>&1; then
    echo "ERROR: Backup file failed pg_restore validation checks."
    rm -f "$BACKUP_FILE"
    exit 1
fi

echo ">>> Backup verification passed successfully ($FILE_SIZE bytes)."
echo ">>> Backup saved to: $BACKUP_FILE"

# Delete backups older than 14 days
echo ">>> Pruning backups older than 14 days..."
find "$BACKUP_DIR" -type f -name "dms_backup_*.dump" -mtime +14 -delete

echo "=== Backup Completed Successfully ==="
