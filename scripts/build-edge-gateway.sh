#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SERVICE_DIR="${REPO_ROOT}/services/edge-gateway"

echo "=== DMS-O2: Building Edge Gateway (C99 Daemon & PLC Simulator) via Docker ==="

docker build -t dms-edge-gateway:latest "${SERVICE_DIR}"

echo "=== Edge Gateway build complete! Image: dms-edge-gateway:latest ==="
