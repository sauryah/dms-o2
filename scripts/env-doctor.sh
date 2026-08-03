#!/usr/bin/env bash
# DMS-O2 Developer Environment Doctor

set -euo pipefail

# Text colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0;0m' # No Color

echo -e "${BLUE}=== DMS-O2 Developer Environment Doctor ===${NC}\n"

# 1. Check Local Toolchain Versions
echo -e "${BLUE}[1/4] Checking Local Toolchain Versions...${NC}"

# Node
if command -v node &> /dev/null; then
    NODE_VER=$(node -v | tr -d 'v')
    NODE_MAJOR=$(echo "$NODE_VER" | cut -d. -f1)
    if [ "$NODE_MAJOR" -ge 18 ]; then
        echo -e "  - Node.js: ${GREEN}v$NODE_VER (Minimum v18 matched)${NC}"
    else
        echo -e "  - Node.js: ${RED}v$NODE_VER (Warning: Minimum version is v18)${NC}"
    fi
else
    echo -e "  - Node.js: ${RED}Not found${NC}"
fi

# Go
if command -v go &> /dev/null; then
    GO_VER=$(go version | awk '{print $3}' | tr -d 'go')
    echo -e "  - Go: ${GREEN}v$GO_VER${NC}"
else
    echo -e "  - Go: ${RED}Not found (Go 1.22+ required for API builds)${NC}"
fi

# Python
if command -v python3 &> /dev/null; then
    PYTHON_VER=$(python3 --version | awk '{print $2}')
    echo -e "  - Python 3: ${GREEN}v$PYTHON_VER${NC}"
else
    echo -e "  - Python 3: ${RED}Not found (Python 3.11+ required)${NC}"
fi

# 2. Check Docker and Container Health
echo -e "\n${BLUE}[2/4] Checking Docker Containers Health...${NC}"
if command -v docker &> /dev/null; then
    if ! docker info &> /dev/null; then
        echo -e "  - Docker daemon: ${RED}Not running${NC}"
    else
        echo -e "  - Docker daemon: ${GREEN}Running${NC}"
        
        # Check active containers for dms-o2
        DMS_CONTAINERS=$(docker compose ps --format json 2>/dev/null || echo "")
        if [ -n "$DMS_CONTAINERS" ]; then
            echo -e "  - Service Status:"
            docker compose ps
        else
            echo -e "  - Service Status: ${YELLOW}No containers running. Run 'make start' to launch.${NC}"
        fi
    fi
else
    echo -e "  - Docker: ${RED}Not installed${NC}"
fi

# 3. Check Certificates and Local CA
echo -e "\n${BLUE}[3/4] Checking Local TLS Certificates...${NC}"
PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
CERT_DIR="$PROJECT_ROOT/certs"

if [ -f "$CERT_DIR/localhost.crt" ] && [ -f "$CERT_DIR/localhost.key" ]; then
    echo -e "  - TLS Certs (localhost): ${GREEN}Found in certs/${NC}"
    # Expiry check
    EXPIRY_DATE=$(openssl x509 -enddate -noout -in "$CERT_DIR/localhost.crt" | cut -d= -f2)
    echo -e "    Expires: $EXPIRY_DATE"
else
    echo -e "  - TLS Certs: ${RED}Missing. Run 'make certs' to generate local certificates.${NC}"
fi

# 4. Check Environment Configuration Files
echo -e "\n${BLUE}[4/4] Checking Environment Manifests...${NC}"
if [ -f "$PROJECT_ROOT/.env" ]; then
    echo -e "  - .env: ${GREEN}Found${NC}"
else
    echo -e "  - .env: ${RED}Missing. Copy .env.example to .env to configure credentials.${NC}"
fi

echo -e "\n${BLUE}===========================================${NC}"
