# DMS Windows Setup Automation Script
# Run this script in PowerShell to configure and start the DMS application

Write-Host "=== DMS (Die Management System) Windows Setup Automation ===" -ForegroundColor Green

# 1. Check if Docker is installed
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "ERROR: Docker is not installed or not in your PATH. Please install Docker Desktop first."
    exit 1
}

# 2. Check environment file
if (-not (Test-Path .env)) {
    Write-Host ">>> Creating .env file from template..."
    Copy-Item .env.example .env
    Write-Host ">>> Created .env file. Please edit it if you need custom database ports or passwords."
} else {
    Write-Host ">>> Environment file .env already exists."
}

# 3. Spin up Docker containers
Write-Host ">>> Bootstrapping containers with Docker Compose..."
docker compose up -d --build

# 4. Wait for database container to become healthy
Write-Host ">>> Waiting for PostgreSQL database container to pass health checks..."
$retries = 30
while ($retries -gt 0) {
    # Run pg_isready inside the db container
    $null = docker compose exec db pg_isready -U dms_user -d dms
    if ($LASTEXITCODE -eq 0) {
        break
    }
    Write-Host "Waiting for database... ($retries retries left)"
    Start-Sleep -Seconds 2
    $retries--
}

if ($retries -eq 0) {
    Write-Error "ERROR: Database container failed to start in time. Check docker logs."
    exit 1
}

# 5. Apply database migrations
Write-Host ">>> Applying database migrations..."
docker compose exec django python manage.py migrate

# 6. Initialize Root account
Write-Host ">>> Checking/Creating default root superuser..."
docker compose exec django python manage.py create_root_user

# 7. Sync Meilisearch indices
Write-Host ">>> Rebuilding Meilisearch index cache..."
docker compose exec django python manage.py sync_search

# 8. Firewall Check (Open Port 80)
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if ($isAdmin) {
    Write-Host ">>> Administrator privileges detected. Opening Port 80 in Windows Firewall..."
    New-NetFirewallRule -DisplayName "DMS Port 80" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue | Out-Null
} else {
    Write-Host ""
    Write-Host ">>> LAN ACCESS SETUP NOTE:" -ForegroundColor Yellow
    Write-Host "    To allow other LAN devices to access this server, open Port 80 in Windows Firewall."
    Write-Host "    Open PowerShell as Administrator and run:"
    Write-Host "    New-NetFirewallRule -DisplayName 'DMS Port 80' -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow"
}

# 9. Access Info
$computerName = $env:COMPUTERNAME.ToLower()
Write-Host ""
Write-Host "======================================================" -ForegroundColor Green
Write-Host ">>> Setup Completed Successfully!" -ForegroundColor Green
Write-Host ">>> You can now access the DMS application at:"
Write-Host "    - Web App URL:  http://localhost"
Write-Host "    - Django Admin: http://localhost/admin/"
Write-Host "    - LAN Address:  http://$computerName"
Write-Host "======================================================" -ForegroundColor Green
