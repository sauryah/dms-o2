#!/usr/bin/env bash
# DMS-O2 Unified Dependency Auditor

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0;0m'

PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)

echo -e "${BLUE}=== DMS-O2 Dependency Auditor ===${NC}\n"

# 1. Frontend Audit
echo -e "${BLUE}[1/3] Auditing Frontend Dependencies (package.json)...${NC}"
cd "$PROJECT_ROOT/frontend"
if command -v npm &>/dev/null; then
    echo -e "  - Running npm audit..."
    npm audit --audit-level=high || echo -e "    ${YELLOW}npm audit completed with high/critical recommendations (see details above).${NC}"
    
    echo -e "\n  - Checking for outdated npm packages..."
    npm outdated || echo -e "    ${YELLOW}Outdated packages listed above.${NC}"
else
    echo -e "  - ${RED}Error: npm not found, skipping frontend audit.${NC}"
fi

# 2. Go API Audit
echo -e "\n${BLUE}[2/3] Auditing Go API Dependencies (go.mod)...${NC}"
cd "$PROJECT_ROOT/go-api"
if command -v go &>/dev/null; then
    echo -e "  - Listing updates for Go modules..."
    go list -u -m all 2>/dev/null | grep -E "\[" || echo -e "    ${GREEN}All direct Go dependencies are up to date!${NC}"
else
    echo -e "  - ${RED}Error: go not found, skipping Go audit.${NC}"
fi

# 3. Python Audit
echo -e "\n${BLUE}[3/3] Auditing Python Backend Dependencies (requirements.txt)...${NC}"
cd "$PROJECT_ROOT"
if command -v python3 &>/dev/null; then
    echo -e "  - Checking PyPI versions..."
    python3 scripts/check_pypi.py
else
    echo -e "  - ${RED}Error: python3 not found, skipping python audit.${NC}"
fi

echo -e "\n${BLUE}===================================${NC}"
