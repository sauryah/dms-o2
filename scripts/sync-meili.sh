#!/usr/bin/env bash
# DMS-O2 Meilisearch Sync Wrapper

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0;0m'

PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
cd "$PROJECT_ROOT"

echo -e "${BLUE}=== DMS-O2 Meilisearch Index Synchronization ===${NC}"

# Check if docker is running the django service
if docker compose ps django 2>/dev/null | grep -q "Up"; then
    echo -e "  - Django container is active. Executing sync in container..."
    docker compose exec -T django python manage.py sync_search
    echo -e "  - ${GREEN}Synchronization complete!${NC}"
else
    echo -e "  - ${YELLOW}Django container is not running.${NC}"
    # Fallback to local python run if dependencies exist, otherwise warn
    if command -v python3 &>/dev/null && python3 -c "import django" &>/dev/null; then
        echo -e "  - Local python with Django detected. Executing sync locally..."
        cd "$PROJECT_ROOT/backend"
        python3 manage.py sync_search
        echo -e "  - ${GREEN}Synchronization complete!${NC}"
    else
        echo -e "  - ${RED}Error: Cannot execute sync. Please run 'make start' to launch containers first.${NC}"
        exit 1
    fi
fi
