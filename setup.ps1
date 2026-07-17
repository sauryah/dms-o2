# DMS Windows Setup Automation Script
# Run this script in PowerShell to configure and start the DMS application

Write-Host "=== DMS Windows Setup Automation ===" -ForegroundColor Green

# 1. Check if Docker is installed
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "ERROR: Docker is not installed or not in your PATH. Please install Docker Desktop first."
    exit 1
}

# 1.5 Check if mkcert is installed
if (-not (Get-Command mkcert -ErrorAction SilentlyContinue)) {
    Write-Host ">>> mkcert not found. Installing via winget..." -ForegroundColor Yellow
    winget install -e --id FiloSottile.MkCert --accept-source-agreements --accept-package-agreements 2>$null
    if (-not (Get-Command mkcert -ErrorAction SilentlyContinue)) {
        Write-Host ">>> WARNING: Could not install mkcert automatically." -ForegroundColor Yellow
        Write-Host ">>> Install manually: https://github.com/FiloSottile/mkcert#installation" -ForegroundColor Yellow
        Write-Host ">>> Then run: scripts\generate-certs.bat" -ForegroundColor Yellow
    }
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
    $rootPass = Generate-Secret 16

    $examplePath = Resolve-Path .env.example
    $content = [System.IO.File]::ReadAllText($examplePath)
    $content = $content.Replace('POSTGRES_PASSWORD=dms_pass_secure_development_placeholder_123', "POSTGRES_PASSWORD=$dbPass")
    $content = $content.Replace('DJANGO_SECRET_KEY=1i-Z36mjYZYX9lwdlTcUGlLflUlt8M6oykwbMa0pmLx3FSWXjwkYQ_i37LCSfhV3', "DJANGO_SECRET_KEY=$djangoKey")
    $content = $content.Replace('MEILI_MASTER_KEY=ghq8ynFj6vPGb29wfZaWpvuCmmQZ4FBPGoZ4xCvxElo', "MEILI_MASTER_KEY=$meiliMaster")
    $content = $content.Replace('ROOT_PASSWORD=root123', "ROOT_PASSWORD=$rootPass")

    $envPath = Join-Path (Get-Location) ".env"
    [System.IO.File]::WriteAllText($envPath, $content)
    Write-Host ">>> Created .env file with generated secure keys and passwords."
} else {
    Write-Host ">>> Environment file .env already exists."
}

# 3. Generate TLS certificates for HTTPS
Write-Host ">>> Generating TLS certificates for HTTPS..." -ForegroundColor Cyan
# Detect LAN IP
$certsLanIp = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    $_.IPAddress -notlike "127.*" -and
    $_.IPAddress -notlike "169.254.*" -and
    $_.InterfaceAlias -notlike "*Loopback*" -and
    $_.InterfaceAlias -notlike "*vEthernet*" -and
    $_.InterfaceAlias -notlike "*docker*" -and
    $_.InterfaceAlias -notlike "*WSL*"
} | Select-Object -First 1 -ExpandProperty IPAddress
if (-not $certsLanIp) {
    $certsLanIp = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" } | Select-Object -First 1 -ExpandProperty IPAddress
}

if ($certsLanIp) {
    if (-not (Test-Path "certs")) { New-Item -ItemType Directory -Path "certs" -Force | Out-Null }
    if (Test-Path "certs\cert.pem") {
        Write-Host ">>> Certificates already exist. Regenerating..." -ForegroundColor Yellow
    }
    & mkcert -install 2>$null
    & mkcert -cert-file "certs\cert.pem" -key-file "certs\key.pem" localhost 127.0.0.1 $certsLanIp ::1
    # Copy root CA for distribution
    $caroot = & mkcert -CAROOT 2>$null
    if ($caroot -and (Test-Path "$caroot\rootCA.pem")) {
        Copy-Item "$caroot\rootCA.pem" "certs\rootCA.pem" -Force
        & certutil -decode "certs\rootCA.pem" "certs\rootCA.cer" 2>$null | Out-Null
        Write-Host ">>> Root CA copied: certs\rootCA.pem and certs\rootCA.cer" -ForegroundColor Green
    }
    Write-Host ">>> TLS certificates generated for $certsLanIp" -ForegroundColor Green
} else {
    Write-Host ">>> WARNING: Could not detect LAN IP. Run scripts\generate-certs.bat manually." -ForegroundColor Yellow
}

# 4. Spin up Docker containers
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
    Write-Host ">>> Administrator privileges detected. Configuring Windows Firewall for LAN Access..."
    New-NetFirewallRule -DisplayName "DMS Port 80" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue | Out-Null
    New-NetFirewallRule -DisplayName "DMS Port 443" -Direction Inbound -LocalPort 443 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue | Out-Null
    Get-NetFirewallRule -DisplayName "Docker Desktop Backend" -ErrorAction SilentlyContinue | Set-NetFirewallRule -Profile Any -ErrorAction SilentlyContinue | Out-Null
} else {
    Write-Host ""
    Write-Host ">>> LAN ACCESS SETUP NOTE:" -ForegroundColor Yellow
    Write-Host "    To allow other LAN devices to access this server:"
    Write-Host "    1. Make sure your Wi-Fi connection profile is set to 'Private' in Windows settings."
    Write-Host "    2. Open PowerShell as Administrator and run the following commands:"
    Write-Host "       New-NetFirewallRule -DisplayName 'DMS Port 80' -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow"
    Write-Host "       New-NetFirewallRule -DisplayName 'DMS Port 443' -Direction Inbound -LocalPort 443 -Protocol TCP -Action Allow"
    Write-Host "       Get-NetFirewallRule -DisplayName 'Docker Desktop Backend' | Set-NetFirewallRule -Profile Any"
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
Write-Host "    - Local Web URL:  https://localhost"
Write-Host "    - Django Admin:   https://localhost/admin/"
if ($lanIps) {
    foreach ($ip in $lanIps) {
        Write-Host "    - LAN Web URL:    https://$ip"
    }
}
Write-Host "    - LAN mDNS URL:   https://$computerName"
Write-Host ""
Write-Host ">>> To access from another computer:" -ForegroundColor Cyan
Write-Host "    Copy certs\rootCA.pem to the other PC, convert and install as trusted root CA"
Write-Host "    See README.md for instructions"
Write-Host "======================================================" -ForegroundColor Green

