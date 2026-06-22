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
    Write-Host ">>> Creating .env file from template with secure dynamic keys..."
    
    function Generate-Secret {
        param ($length = 32)
        $guidStr = [guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N")
        return $guidStr.Substring(0, $length)
    }

    $dbPass = Generate-Secret 24
    $djangoKey = Generate-Secret 60
    $meiliMaster = Generate-Secret 32
    $meiliSearch = Generate-Secret 32
    $rootPass = Generate-Secret 16

    $examplePath = Resolve-Path .env.example
    $content = [System.IO.File]::ReadAllText($examplePath)
    $content = $content.Replace('POSTGRES_PASSWORD=change_me', "POSTGRES_PASSWORD=$dbPass")
    $content = $content.Replace('DJANGO_SECRET_KEY=md7db91F0^W3*t)skUXp$vzfHU<]Nx@+]DcS5Kz?hm<fPg&&gd=5EvWu&zuevm](', "DJANGO_SECRET_KEY=$djangoKey")
    $content = $content.Replace('MEILI_MASTER_KEY=Kk?UEj]Uk1dDSFNfK.fXHj0jP<DB*yJ9>4Dsh:6&Wwh96waja>2.1@R+8%t4%K4(', "MEILI_MASTER_KEY=$meiliMaster")
    $content = $content.Replace('MEILI_SEARCH_KEY=B5wT65kBM$UG!tnWk@tkR59T]tuSTwnSG#%xUGQZC@q@$auPem&Sub1$02hDuGNb', "MEILI_SEARCH_KEY=$meiliSearch")
    $content = $content.Replace('ROOT_PASSWORD=root_pass_1234567890', "ROOT_PASSWORD=$rootPass")

    $envPath = Join-Path (Get-Location) ".env"
    [System.IO.File]::WriteAllText($envPath, $content)
    Write-Host ">>> Created .env file with generated secure keys and passwords."
} else {
    Write-Host ">>> Environment file .env already exists."
}

# 3. Spin up Docker containers
Write-Host ">>> Pre-pulling required Docker images sequentially to prevent connection timeouts..." -ForegroundColor Cyan
$images = @(
    "postgres:18-alpine",
    "getmeili/meilisearch:v1.7",
    "redis:7-alpine",
    "traefik:v3",
    "python:3.11-slim",
    "golang:1.22-alpine",
    "node:18-alpine",
    "alpine:latest"
)
foreach ($img in $images) {
    Write-Host ">>> Pulling $img..."
    docker pull $img
}

Write-Host ">>> Bootstrapping containers with Docker Compose..." -ForegroundColor Green
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
$lanIps = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    $_.IPAddress -notlike "127.*" -and
    $_.IPAddress -notlike "169.254.*" -and
    $_.InterfaceAlias -notlike "*Loopback*" -and
    $_.InterfaceAlias -notlike "*vEthernet*" -and
    $_.InterfaceAlias -notlike "*docker*" -and
    $_.InterfaceAlias -notlike "*WSL*"
} | Select-Object -ExpandProperty IPAddress

# Fallback if no specific LAN interface matches
if (-not $lanIps) {
    $lanIps = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" } | Select-Object -ExpandProperty IPAddress
}

Write-Host ""
Write-Host "======================================================" -ForegroundColor Green
Write-Host ">>> Setup Completed Successfully!" -ForegroundColor Green
Write-Host ">>> You can now access the DMS application at:"
Write-Host "    - Local Web URL:  http://localhost"
Write-Host "    - Django Admin:   http://localhost/admin/"
if ($lanIps) {
    foreach ($ip in $lanIps) {
        Write-Host "    - LAN Web URL:    http://$ip"
    }
}
Write-Host "    - LAN mDNS URL:   http://$computerName"
Write-Host "======================================================" -ForegroundColor Green

