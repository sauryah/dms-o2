#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENGINE_DIR="${REPO_ROOT}/wasm-drawing-engine"
TARGET_DIR="${REPO_ROOT}/frontend/src/features/wire-drawing-calculator/wasm/pkg"

echo "=== DMS-O2: Building wasm-drawing-engine via Docker ==="

if ! docker image inspect dms-wasm-builder:latest >/dev/null 2>&1; then
    echo "Building dms-wasm-builder Docker image..."
    docker build -t dms-wasm-builder "${ENGINE_DIR}"
fi

echo "Compiling Rust crate to WebAssembly..."
docker run --rm -v "${ENGINE_DIR}:/workspace" dms-wasm-builder wasm-pack build --target web --out-dir /workspace/pkg

echo "Copying compiled Wasm assets to frontend..."
mkdir -p "${TARGET_DIR}"
cp -rf "${ENGINE_DIR}/pkg/"* "${TARGET_DIR}/"
rm -f "${TARGET_DIR}/.gitignore"

echo "=== Wasm build complete! Output placed in ${TARGET_DIR} ==="
