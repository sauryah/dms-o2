# PowerShell build script for DMS Edge Gateway using Docker
$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir
$serviceDir = Join-Path $repoRoot "services/edge-gateway"

Write-Host "=== DMS-O2: Building Edge Gateway (C99 Daemon & PLC Simulator) via Docker ===" -ForegroundColor Cyan

docker build -t dms-edge-gateway:latest $serviceDir

Write-Host "=== Edge Gateway build complete! Image: dms-edge-gateway:latest ===" -ForegroundColor Green
