# DMS-O2 Unified Dependency Auditor (PowerShell)
# Cross-platform dependency scanner for Windows and Linux hosts

$ErrorActionPreference = "Continue"

Write-Host "=== DMS-O2 Dependency Auditor ===" -ForegroundColor Cyan

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir

# 1. Frontend Audit
Write-Host "`n[1/3] Auditing Frontend Dependencies (package.json)..." -ForegroundColor Cyan
if (Get-Command npm.cmd -ErrorAction SilentlyContinue) {
    Push-Location (Join-Path $projectRoot "frontend")
    Write-Host "  - Running npm audit..."
    & npm.cmd audit --audit-level=high
    Write-Host "  - Checking for outdated packages..."
    & npm.cmd outdated
    Pop-Location
} else {
    Write-Host "  - npm not found on PATH, skipping frontend audit." -ForegroundColor Yellow
}

# 2. Go API Audit
Write-Host "`n[2/3] Auditing Go API Dependencies (go.mod)..." -ForegroundColor Cyan
if (Get-Command docker -ErrorAction SilentlyContinue) {
    Write-Host "  - Checking Go dependencies via Docker container..."
    & docker run --rm -v "${projectRoot}/go-api:/app" -w /app golang:1.22-alpine go list -m all
} else {
    Write-Host "  - Docker not found, skipping containerized Go audit." -ForegroundColor Yellow
}

# 3. Python Backend Audit
Write-Host "`n[3/3] Auditing Python Backend Dependencies (requirements.txt)..." -ForegroundColor Cyan
if (Get-Command docker -ErrorAction SilentlyContinue) {
    Write-Host "  - Checking Python environment in dms-o2-django-1..."
    & docker exec dms-o2-django-1 pip list --outdated
} else {
    Write-Host "  - Docker not found, skipping Python audit." -ForegroundColor Yellow
}

Write-Host "`n=== Dependency Audit Complete ===" -ForegroundColor Green
