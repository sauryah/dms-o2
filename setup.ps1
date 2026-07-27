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
$envPath = Join-Path $PSScriptRoot ".env"
if (-not (Test-Path $envPath)) {
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
    $redisPass = Generate-Secret 24
    $apiSecret = Generate-Secret 32

    $examplePath = Join-Path $PSScriptRoot ".env.example"
    $content = [System.IO.File]::ReadAllText($examplePath)
    $content = $content.Replace('POSTGRES_PASSWORD=auto:run_setup_to_generate', "POSTGRES_PASSWORD=$dbPass")
    $content = $content.Replace('DJANGO_SECRET_KEY=auto:run_setup_to_generate', "DJANGO_SECRET_KEY=$djangoKey")
    $content = $content.Replace('MEILI_MASTER_KEY=auto:run_setup_to_generate', "MEILI_MASTER_KEY=$meiliMaster")
    $content = $content.Replace('ROOT_PASSWORD=auto:run_setup_to_generate', "ROOT_PASSWORD=$rootPass")
    $content = $content.Replace('REDIS_PASSWORD=auto:run_setup_to_generate', "REDIS_PASSWORD=$redisPass")
    $content = $content.Replace('INTERNAL_API_SECRET=auto:run_setup_to_generate', "INTERNAL_API_SECRET=$apiSecret")

    [System.IO.File]::WriteAllText($envPath, $content)
    Write-Host ">>> Created .env file with generated secure keys and passwords."
} else {
    Write-Host ">>> Environment file .env already exists."
}

# 3. Generate TLS certificates for HTTPS
Write-Host ">>> Generating TLS certificates for HTTPS..." -ForegroundColor Cyan
# Detect LAN IP - prefer physical adapters, exclude virtual/docker/WSL
$certsLanIp = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    $_.IPAddress -notlike "127.*" -and
    $_.IPAddress -notlike "169.254.*" -and
    $_.InterfaceAlias -notmatch "Loopback|vEthernet|docker|WSL|Hyper|Default Switch"
} | Select-Object -First 1 -ExpandProperty IPAddress
if (-not $certsLanIp) {
    $certsLanIp = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" } | Select-Object -First 1 -ExpandProperty IPAddress
}

if ($certsLanIp) {
    $certsDir = Join-Path $PSScriptRoot "certs"
    if (-not (Test-Path $certsDir)) { New-Item -ItemType Directory -Path $certsDir -Force | Out-Null }
    
    $certPem = Join-Path $certsDir "cert.pem"
    $keyPem = Join-Path $certsDir "key.pem"
    if (Test-Path $certPem) {
        Write-Host ">>> Certificates already exist. Regenerating..." -ForegroundColor Yellow
    }
    & mkcert -install 2>$null
    & mkcert -cert-file $certPem -key-file $keyPem localhost 127.0.0.1 $certsLanIp ::1
    # Copy root CA for distribution
    $caroot = & mkcert -CAROOT 2>$null
    if ($caroot -and (Test-Path "$caroot\rootCA.pem")) {
        $rootCaPem = Join-Path $certsDir "rootCA.pem"
        $rootCaCer = Join-Path $certsDir "rootCA.cer"
        Copy-Item "$caroot\rootCA.pem" $rootCaPem -Force
        & certutil -decode $rootCaPem $rootCaCer 2>$null | Out-Null
        Write-Host ">>> Root CA copied: certs\rootCA.pem and certs\rootCA.cer" -ForegroundColor Green
    }
    Write-Host ">>> TLS certificates generated for $certsLanIp" -ForegroundColor Green

    # Automatically generate a client certificate if mTLS is enabled in dynamic.yml
    $autoClientCertGenerated = $false
    $dynamicYmlPath = Join-Path $PSScriptRoot "dynamic.yml"
    if (Test-Path $dynamicYmlPath) {
        $dynamicYml = Get-Content $dynamicYmlPath -Raw
        if ($dynamicYml -match "clientAuth:") {
            Write-Host ">>> mTLS is enabled. Auto-generating a universal client certificate..." -ForegroundColor Cyan
            $clientName = "universal"
            $clientPem = Join-Path $certsDir "client-$clientName.pem"
            $clientKey = Join-Path $certsDir "client-$clientName-key.pem"
            $clientP12 = Join-Path $certsDir "client-$clientName.p12"
            $rootCaPem = Join-Path $certsDir "rootCA.pem"

            & mkcert -client -cert-file $clientPem -key-file $clientKey localhost 127.0.0.1 ::1
            
            $openssl = Get-Command openssl -ErrorAction SilentlyContinue
            if (-not $openssl) {
                if (Test-Path "C:\Program Files\Git\usr\bin\openssl.exe") {
                    $openssl = "C:\Program Files\Git\usr\bin\openssl.exe"
                } elseif (Test-Path "C:\Program Files (x86)\Git\usr\bin\openssl.exe") {
                    $openssl = "C:\Program Files (x86)\Git\usr\bin\openssl.exe"
                }
            }
            if ($openssl) {
                & $openssl pkcs12 -export -out $clientP12 -inkey $clientKey -in $clientPem -certfile $rootCaPem -passout pass:
                
                # Generate companion instructions and installer scripts using script root paths
                $templateDir = Join-Path $PSScriptRoot "scripts"
                
                $instructionsTemplate = Join-Path $templateDir "client-instructions-template.txt"
                if (Test-Path $instructionsTemplate) {
                    $inst = [System.IO.File]::ReadAllText($instructionsTemplate).Replace('{{CLIENT_NAME}}', $clientName)
                    [System.IO.File]::WriteAllText((Join-Path $certsDir "client-$clientName-INSTRUCTIONS.txt"), $inst)
                }
                $batTemplate = Join-Path $templateDir "client-install-template.bat"
                if (Test-Path $batTemplate) {
                    $bat = [System.IO.File]::ReadAllText($batTemplate).Replace('{{CLIENT_NAME}}', $clientName)
                    [System.IO.File]::WriteAllText((Join-Path $certsDir "client-$clientName-install.bat"), $bat)
                }
                $shTemplate = Join-Path $templateDir "client-install-template.sh"
                if (Test-Path $shTemplate) {
                    $sh = [System.IO.File]::ReadAllText($shTemplate).Replace('{{CLIENT_NAME}}', $clientName)
                    [System.IO.File]::WriteAllText((Join-Path $certsDir "client-$clientName-install.sh"), $sh)
                }
                
                Write-Host ">>> Auto-generated universal client certificate: certs\client-$clientName.p12" -ForegroundColor Green
                $autoClientCertGenerated = $true
            } else {
                Write-Host ">>> WARNING: openssl not found. Could not auto-generate .p12 client certificate bundle." -ForegroundColor Yellow
            }
        }
    }

    # Automatically add detected LAN IP and hostname to DJANGO_ALLOWED_HOSTS in .env
    $envPath = Join-Path $PSScriptRoot ".env"
    if (Test-Path $envPath) {
        $envContent = [System.IO.File]::ReadAllText($envPath)
        if ($envContent -match 'DJANGO_ALLOWED_HOSTS=(.*)') {
            $existingHosts = $Matches[1].Trim()
            $hostArr = $existingHosts -split ',' | ForEach-Object { $_.Trim() }
            $updated = $false
            if ($certsLanIp -and $hostArr -notcontains $certsLanIp) {
                $existingHosts += ",$certsLanIp"
                $updated = $true
            }
            $compName = $env:COMPUTERNAME.ToLower()
            if ($compName -and $hostArr -notcontains $compName) {
                $existingHosts += ",$compName"
                $updated = $true
            }
            if ($updated) {
                $envContent = $envContent -replace 'DJANGO_ALLOWED_HOSTS=.*', "DJANGO_ALLOWED_HOSTS=$existingHosts"
                [System.IO.File]::WriteAllText($envPath, $envContent)
                Write-Host ">>> Updated DJANGO_ALLOWED_HOSTS in .env with LAN IP ($certsLanIp) and hostname ($compName)" -ForegroundColor Green
            }
        }
    }
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
    $null = docker compose exec db pg_isready
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
$dynamicYml = ""
if (Test-Path "dynamic.yml") {
    $dynamicYml = Get-Content "dynamic.yml" -Raw
}
if ($dynamicYml -match "clientAuth:") {
    Write-Host ">>> IMPORTANT: Mutual TLS (mTLS) is enabled!" -ForegroundColor Yellow
    if ($autoClientCertGenerated) {
        Write-Host "    We auto-generated a universal client certificate and installers for you:" -ForegroundColor Green
        Write-Host "      certs\client-universal.p12 (Universal certificate)" -ForegroundColor Green
        Write-Host "      certs\client-universal-install.bat (Windows installer)" -ForegroundColor Green
        Write-Host "      certs\client-universal-install.sh (macOS/Linux installer)" -ForegroundColor Green
        Write-Host "    Please run the installer script on your client device to gain access."
    } else {
        Write-Host "    To access the application, you must install a client certificate."
        Write-Host "    Refer to README.md for instructions on certificate setup."
    }
    Write-Host ""
}
Write-Host ">>> To access from another computer:" -ForegroundColor Cyan
Write-Host "    Copy the client-universal files and rootCA.cer/rootCA.pem to the other PC."
Write-Host "    Run the installer script on the client machine to trust the CA and install the cert."
Write-Host "    See README.md for instructions"
Write-Host "======================================================" -ForegroundColor Green

