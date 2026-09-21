#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SERVICE_DIR="${REPO_ROOT}/services/metallurgy-analytics"

echo "=== DMS-O2: Building Metallurgy Analytics (Julia 1.10 Engine) via Docker ==="

docker build -t dms-metallurgy-analytics:latest "${SERVICE_DIR}"

echo "=== Metallurgy Analytics build complete! Image: dms-metallurgy-analytics:latest ==="
