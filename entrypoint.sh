#!/bin/sh
set -e

# If the command starts with custom arguments (not supervisord), run it directly
if [ "$#" -gt 0 ] && [ "$1" != "supervisord" ]; then
  exec "$@"
fi

# Run database migrations if configured
if [ "$RUN_MIGRATIONS" = "true" ]; then
  echo ">>> Checking database connection..."
  # Wait for postgres to be ready
  if [ -n "$POSTGRES_HOST" ]; then
    until pg_isready -h "$POSTGRES_HOST" -p "${POSTGRES_PORT:-5432}" -U "${POSTGRES_USER:-dms_user}" -d "${POSTGRES_DB:-dms}" >/dev/null 2>&1; do
      echo ">>> Waiting for PostgreSQL database at $POSTGRES_HOST..."
      sleep 2
    done
  fi

  echo ">>> Running database migrations..."
  python manage.py migrate --noinput
  
  echo ">>> Checking/Creating default root superuser..."
  python manage.py create_root_user || echo ">>> WARNING: Failed to ensure root user, skipping..."
  
  echo ">>> Syncing search index..."
  python manage.py sync_search || echo ">>> WARNING: Meilisearch might not be online yet, skipping search index sync"
fi

# Start Supervisord to manage processes
echo ">>> Starting DMS-O2 unified services via Supervisord..."
exec supervisord -c /etc/supervisor/supervisord.conf
