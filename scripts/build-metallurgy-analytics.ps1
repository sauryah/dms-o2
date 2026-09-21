# PowerShell build script for DMS Metallurgy Analytics using Docker
$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir
$serviceDir = Join-Path $repoRoot "services/metallurgy-analytics"

Write-Host "=== DMS-O2: Building Metallurgy Analytics (Julia 1.10 Engine) via Docker ===" -ForegroundColor Cyan

docker build -t dms-metallurgy-analytics:latest $serviceDir

Write-Host "=== Metallurgy Analytics build complete! Image: dms-metallurgy-analytics:latest ===" -ForegroundColor Green
