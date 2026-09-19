# PowerShell build script for wasm-drawing-engine using Docker
$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir
$engineDir = Join-Path $repoRoot "wasm-drawing-engine"
$targetDir = Join-Path $repoRoot "frontend/src/features/wire-drawing-calculator/wasm/pkg"

Write-Host "=== DMS-O2: Building wasm-drawing-engine via Docker ===" -ForegroundColor Cyan

# Check if dms-wasm-builder image exists, otherwise build it
$imageCheck = docker images -q dms-wasm-builder:latest
if (-not $imageCheck) {
    Write-Host "Building dms-wasm-builder Docker image..." -ForegroundColor Yellow
    docker build -t dms-wasm-builder $engineDir
}

# Compile wasm inside container
Write-Host "Compiling Rust crate to WebAssembly..." -ForegroundColor Yellow
docker run --rm -v "${engineDir}:/workspace" dms-wasm-builder wasm-pack build --target web --out-dir /workspace/pkg

# Ensure destination directory exists
if (-not (Test-Path $targetDir)) {
    New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
}

# Copy compiled artifacts to frontend
Write-Host "Copying compiled Wasm assets to frontend..." -ForegroundColor Yellow
Copy-Item -Path (Join-Path $engineDir "pkg/*") -Destination $targetDir -Recurse -Force
if (Test-Path (Join-Path $targetDir ".gitignore")) {
    Remove-Item -Force (Join-Path $targetDir ".gitignore")
}

Write-Host "=== Wasm build complete! Output placed in $targetDir ===" -ForegroundColor Green
