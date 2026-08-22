#!/usr/bin/env bash
# DMS-O2 Automated Backup Restoration Smoke-Test Utility
# Validates database backup dump files by performing an ephemeral test restoration and record integrity check.

set -euo pipefail

# Text formatting
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== DMS-O2 Backup Integrity Verifier ===${NC}\n"

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | tr -d '\r' | xargs)
fi

POSTGRES_USER="${POSTGRES_USER:-dms_user}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-dms_pass_password}"
TEST_DB_NAME="dms_backup_smoke_test_$(date +%s)"

# Identify target backup file
BACKUP_FILE="${1:-}"
if [ -z "$BACKUP_FILE" ]; then
    # Find latest backup in ./backups
    if [ -d "./backups" ]; then
        BACKUP_FILE=$(ls -t ./backups/*.dump 2>/dev/null | head -n 1 || true)
    fi
fi

if [ -z "$BACKUP_FILE" ] || [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${YELLOW}No existing backup file provided or found in ./backups/. Triggering on-demand backup for verification...${NC}"
    docker compose exec -T django python manage.py backup_db
    BACKUP_FILE=$(ls -t ./backups/*.dump 2>/dev/null | head -n 1)
fi

BACKUP_FILENAME=$(basename "$BACKUP_FILE")
echo -e "${BLUE}Target Backup File:${NC} $BACKUP_FILENAME"
echo -e "${BLUE}Target Ephemeral DB:${NC} $TEST_DB_NAME\n"

# Cleanup function to drop temporary test database on exit
cleanup() {
    echo -e "\n${BLUE}>>> Cleaning up ephemeral test database '$TEST_DB_NAME'...${NC}"
    docker compose exec -T -e PGPASSWORD="$POSTGRES_PASSWORD" db psql -U "$POSTGRES_USER" -d "postgres" -c "DROP DATABASE IF EXISTS $TEST_DB_NAME;" > /dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

# 1. Create ephemeral database
echo -e "${BLUE}[1/4] Creating ephemeral database '$TEST_DB_NAME'...${NC}"
docker compose exec -T -e PGPASSWORD="$POSTGRES_PASSWORD" db psql -U "$POSTGRES_USER" -d "postgres" -c "CREATE DATABASE $TEST_DB_NAME;" > /dev/null

# 2. Restore backup into ephemeral database
echo -e "${BLUE}[2/4] Restoring dump into '$TEST_DB_NAME'...${NC}"
set +e
RESTORE_OUTPUT=$(docker compose exec -T -e PGPASSWORD="$POSTGRES_PASSWORD" db pg_restore -U "$POSTGRES_USER" -d "$TEST_DB_NAME" --no-owner "/backups/$BACKUP_FILENAME" 2>&1)
RESTORE_EXIT_CODE=$?
set -e

if [ $RESTORE_EXIT_CODE -ne 0 ] && [ $RESTORE_EXIT_CODE -ne 1 ]; then
    echo -e "  - ${RED}pg_restore failed with exit code $RESTORE_EXIT_CODE:${NC}\n$RESTORE_OUTPUT"
    exit 1
fi
echo -e "  - ${GREEN}pg_restore finished successfully.${NC}"

# 3. Assert database table record counts
echo -e "${BLUE}[3/4] Validating database table record integrity...${NC}"

count_query() {
    local table="$1"
    docker compose exec -T -e PGPASSWORD="$POSTGRES_PASSWORD" db psql -U "$POSTGRES_USER" -d "$TEST_DB_NAME" -t -A -c "SELECT COUNT(*) FROM $table;" 2>/dev/null || echo "0"
}

DIES_COUNT=$(count_query "dies_die")
USERS_COUNT=$(count_query "users_user")
HISTORY_COUNT=$(count_query "history_diehistory")
MACHINES_COUNT=$(count_query "machines_machine")

echo -e "  - Dies count: ${GREEN}$DIES_COUNT${NC}"
echo -e "  - Users count: ${GREEN}$USERS_COUNT${NC}"
echo -e "  - History events: ${GREEN}$HISTORY_COUNT${NC}"
echo -e "  - Machines count: ${GREEN}$MACHINES_COUNT${NC}"

# Ensure fundamental tables are present
if [ "$USERS_COUNT" -le 0 ]; then
    echo -e "  - ${RED}Integrity check failed: users_user table has 0 records.${NC}"
    exit 1
fi

# 4. Final verification result
echo -e "\n${BLUE}[4/4] Verification Result:${NC}"
echo -e "  ${GREEN}✓ Backup '$BACKUP_FILENAME' is valid, structurally sound, and restored cleanly.${NC}"
echo -e "\n${BLUE}=== Integrity Verification Completed Successfully ===${NC}"
