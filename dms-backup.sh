#!/usr/bin/env bash
set -e

# Load environment variables from .env if present
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

ACTION="$1"

usage() {
    echo "DMS Backup & Restore Utility"
    echo "Usage:"
    echo "  ./dms-backup.sh backup             - Trigger a manual database backup"
    echo "  ./dms-backup.sh list               - List all available backups"
    echo "  ./dms-backup.sh restore <file>     - Restore database from a backup file"
    exit 1
}

case "$ACTION" in
    backup)
        echo ">>> Triggering database backup..."
        docker compose exec -T backup /scripts/backup_db.sh
        ;;
    list)
        echo ">>> Available backup files in ./backups/:"
        if [ -d "./backups" ]; then
            ls -1 ./backups/*.dump 2>/dev/null | xargs -n 1 basename || echo "No backups found."
        else
            echo "No backups directory found."
        fi
        ;;
    restore)
        FILE="$2"
        if [ -z "$FILE" ]; then
            echo "Error: Please specify the backup filename."
            echo "Example: ./dms-backup.sh restore dms_backup_20260614_205000.dump"
            exit 1
        fi
        
        if [ ! -f "./backups/$FILE" ]; then
            echo "Error: Backup file ./backups/$FILE not found."
            exit 1
        fi
        
        read -p "WARNING: This will overwrite your current database. Proceed? (y/N): " confirm
        if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
            echo "Cancelled."
            exit 0
        fi
        
        echo ">>> Restoring database from ./backups/$FILE..."
        # Run pg_restore inside the backup container (which matches the PostgreSQL 18 server version)
        docker compose exec -T -e PGPASSWORD="$POSTGRES_PASSWORD" backup pg_restore -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --no-owner "/backups/$FILE"
        
        echo ">>> Rebuilding Meilisearch search index..."
        docker compose exec -T django python manage.py sync_search
        
        echo "=== Restore Completed Successfully ==="
        ;;
    *)
        usage
        ;;
esac
