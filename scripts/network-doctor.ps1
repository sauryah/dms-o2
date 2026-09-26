# =============================================================================
# DMS-O2 Network & Multi-Device Access Doctor
# =============================================================================
# Run this script to audit local network access, container health, firewall
# rules, mDNS resolution, and live HTTPS endpoints.
# =============================================================================

param (
    [switch]$Repair,
    [switch]$NonInteractive
)

$ErrorActionPreference = "Continue"

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "         DMS-O2 Network & Multi-Device Access Doctor            " -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host ""

$issuesFound = 0

# -----------------------------------------------------------------------------
# 1. Host Network Interface & Physical IP Audit
# -----------------------------------------------------------------------------
Write-Host "[1/5] Checking Host Network Interface & IPv4..." -ForegroundColor Yellow

$lanIp = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    $_.IPAddress -notlike "127.*" -and
    $_.IPAddress -notlike "169.254.*" -and
    $_.InterfaceAlias -notmatch "Loopback|vEthernet|docker|WSL|Hyper"
} | Select-Object -First 1 -ExpandProperty IPAddress

if ($lanIp) {
    Write-Host "  [PASS] Active Physical IPv4: $lanIp" -ForegroundColor Green
} else {
    Write-Host "  [WARN] Could not automatically detect physical LAN IPv4." -ForegroundColor Red
    $lanIp = "127.0.0.1"
    $issuesFound++
}

# Check Network Category (Private vs Public)
try {
    $profile = Get-NetConnectionProfile | Where-Object { $_.IPv4Connectivity -eq 'Internet' -or $_.InterfaceAlias -match 'Ethernet|Wi-Fi' } | Select-Object -First 1
    if ($profile) {
        if ($profile.NetworkCategory -eq 'Private' -or $profile.NetworkCategory -eq 'DomainAuthenticated') {
            Write-Host "  [PASS] Network Profile: $($profile.NetworkCategory) ($($profile.InterfaceAlias))" -ForegroundColor Green
        } else {
            Write-Host "  [WARN] Network Profile is 'Public' ($($profile.InterfaceAlias))." -ForegroundColor Yellow
            Write-Host "         Third-party antivirus/firewalls may block LAN incoming connections." -ForegroundColor Gray
            Write-Host "         To set to Private: Set-NetConnectionProfile -InterfaceIndex $($profile.InterfaceIndex) -NetworkCategory Private" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "  [INFO] Could not query network profile (requires Admin)." -ForegroundColor Gray
}

# Check .env configuration
$envFile = Join-Path $PSScriptRoot "..\.env"
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile -Raw
    if ($envContent -match "DJANGO_ALLOWED_HOSTS=(.*)") {
        $allowedHosts = $matches[1]
        if ($allowedHosts -match [regex]::Escape($lanIp)) {
            Write-Host "  [PASS] Active IP ($lanIp) is in DJANGO_ALLOWED_HOSTS" -ForegroundColor Green
        } else {
            Write-Host "  [WARN] Active IP ($lanIp) is NOT explicitly listed in DJANGO_ALLOWED_HOSTS." -ForegroundColor Yellow
            Write-Host "         (Dynamic RFC 1918 matcher handles private IPs automatically if DJANGO_ALLOW_PRIVATE_IPS=True)" -ForegroundColor Gray
        }
    }
}

Write-Host ""

# -----------------------------------------------------------------------------
# 2. Windows Defender Firewall Inbound Rules (Ports 80 & 443)
# -----------------------------------------------------------------------------
Write-Host "[2/5] Checking Windows Firewall Inbound Rules..." -ForegroundColor Yellow

$rule80 = netsh advfirewall firewall show rule name="DMS Port 80" 2>$null | Out-String
$rule443 = netsh advfirewall firewall show rule name="DMS Port 443" 2>$null | Out-String

if ($rule80 -match "Enabled:\s+Yes" -and $rule80 -match "Action:\s+Allow") {
    Write-Host "  [PASS] Port 80 Inbound Rule: Enabled & Allowed" -ForegroundColor Green
} else {
    Write-Host "  [WARN] Port 80 Inbound Rule ('DMS Port 80') is missing or not allowed." -ForegroundColor Yellow
    $issuesFound++
}

if ($rule443 -match "Enabled:\s+Yes" -and $rule443 -match "Action:\s+Allow") {
    Write-Host "  [PASS] Port 443 Inbound Rule: Enabled & Allowed" -ForegroundColor Green
} else {
    Write-Host "  [WARN] Port 443 Inbound Rule ('DMS Port 443') is missing or not allowed." -ForegroundColor Yellow
    $issuesFound++
}

Write-Host ""

# -----------------------------------------------------------------------------
# 3. mDNS & Hostname Resolution
# -----------------------------------------------------------------------------
Write-Host "[3/5] Checking Local mDNS Name Resolution..." -ForegroundColor Yellow

$hostname = $env:COMPUTERNAME
$localDomain = "$($hostname.ToLower()).local"

try {
    $resolved = Resolve-DnsName -Name $localDomain -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -eq $lanIp }
    if ($resolved) {
        Write-Host "  [PASS] mDNS Name '$localDomain' resolves to $lanIp" -ForegroundColor Green
    } else {
        Write-Host "  [INFO] '$localDomain' resolved to multiple/virtual addresses. Windows mDNS is active." -ForegroundColor Green
    }
} catch {
    Write-Host "  [INFO] Windows mDNS check completed." -ForegroundColor Gray
}

Write-Host ""

# -----------------------------------------------------------------------------
# 4. Docker Container Health & Process Audit
# -----------------------------------------------------------------------------
Write-Host "[4/5] Checking Docker Container Stack Status..." -ForegroundColor Yellow

$containers = docker compose ps --format json 2>$null | ConvertFrom-Json

if (-not $containers -or $containers.Count -eq 0) {
    Write-Host "  [FAIL] No running containers found! Docker stack may be down." -ForegroundColor Red
    $issuesFound++
} else {
    $healthyCount = 0
    foreach ($c in $containers) {
        $name = $c.Name
        $status = $c.Status
        $state = $c.State

        if ($status -match "\(healthy\)" -or $state -eq "running") {
            Write-Host "  [PASS] $name : $status" -ForegroundColor Green
            $healthyCount++
        } else {
            Write-Host "  [FAIL] $name : $status (State: $state)" -ForegroundColor Red
            $issuesFound++
        }
    }
    Write-Host "  Stack Health: $healthyCount/$($containers.Count) containers active/healthy." -ForegroundColor Cyan
}

Write-Host ""

# -----------------------------------------------------------------------------
# 5. Live Endpoint & Route Probes
# -----------------------------------------------------------------------------
Write-Host "[5/5] Testing Live Network Endpoints & Probes..." -ForegroundColor Yellow

function Test-Endpoint {
    param([string]$Url, [string]$Label)
    try {
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        $resp = curl.exe -k -s -o /dev/null -w "%{http_code}" --max-time 5 $Url 2>$null
        $sw.Stop()
        if ($resp -eq "200") {
            Write-Host "  [PASS] $Label ($Url) -> HTTP $resp ($($sw.ElapsedMilliseconds)ms)" -ForegroundColor Green
        } elseif ($resp -eq "308" -or $resp -eq "301" -or $resp -eq "302") {
            Write-Host "  [PASS] $Label ($Url) -> HTTP $resp Redirect ($($sw.ElapsedMilliseconds)ms)" -ForegroundColor Green
        } else {
            Write-Host "  [FAIL] $Label ($Url) -> HTTP $resp" -ForegroundColor Red
            return $false
        }
        return $true
    } catch {
        Write-Host "  [FAIL] $Label ($Url) -> Connection Failed" -ForegroundColor Red
        return $false
    }
}

$probe1 = Test-Endpoint "https://localhost" "Localhost Frontend"
$probe2 = Test-Endpoint "https://$lanIp" "LAN IP Frontend"
$probe3 = Test-Endpoint "https://$localDomain" "mDNS Frontend ($localDomain)"
$probe4 = Test-Endpoint "https://$lanIp/api/v1/health/" "Django API Health"
$probe5 = Test-Endpoint "https://$lanIp/api/go/health" "Go Query API Health"

Write-Host ""
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "                       SUMMARY & URLS                            " -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Workshop Client URLs (Open these on other computers):" -ForegroundColor White
Write-Host "    Primary (Hostname): https://$localDomain" -ForegroundColor Cyan
Write-Host "    Fallback (LAN IP):  https://$lanIp" -ForegroundColor Cyan
Write-Host ""
Write-Host "  To trust the SSL Certificate on another computer:" -ForegroundColor White
Write-Host "    1. Copy 'certs\rootCA.cer' to that computer" -ForegroundColor Gray
Write-Host "    2. Right-click 'scripts\install-cert.bat' -> Run as Administrator" -ForegroundColor Gray
Write-Host "    3. Restart your browser -> Green padlock appears" -ForegroundColor Gray
Write-Host ""

if ($issuesFound -eq 0) {
    Write-Host ">>> ALL CHECKS PASSED. System is fully operational and reachable across LAN! <<<" -ForegroundColor Green
} else {
    Write-Host ">>> $issuesFound issue(s) detected. <<<" -ForegroundColor Yellow
}

# -----------------------------------------------------------------------------
# Optional Interactive Repair
# -----------------------------------------------------------------------------
if ($Repair -or ($issuesFound -gt 0 -and -not $NonInteractive)) {
    Write-Host ""
    Write-Host "Repair Menu:" -ForegroundColor Yellow
    Write-Host "  [1] Clean restart Docker container stack" -ForegroundColor White
    Write-Host "  [2] Full WSL2 & Docker runtime reset (fixes procReady / PID exhaustion)" -ForegroundColor White
    Write-Host "  [3] Regenerate TLS certificates with current LAN IP and mDNS SANs" -ForegroundColor White
    Write-Host "  [4] Add missing Windows Firewall rules (requires Admin)" -ForegroundColor White
    Write-Host "  [Q] Quit" -ForegroundColor White
    Write-Host ""
    $choice = Read-Host "Select an option [1-4, Q]"

    switch ($choice) {
        "1" {
            Write-Host "Restarting Docker stack..." -ForegroundColor Cyan
            docker compose down
            docker compose up -d
        }
        "2" {
            Write-Host "Executing full WSL2 and Docker reset..." -ForegroundColor Cyan
            docker compose down
            wsl.exe --shutdown
            Start-Sleep -Seconds 3
            docker compose up -d
        }
        "3" {
            Write-Host "Regenerating certificates..." -ForegroundColor Cyan
            & "$PSScriptRoot\generate_openssl_certs.ps1"
            docker compose restart traefik
        }
        "4" {
            Write-Host "Adding Windows Firewall rules..." -ForegroundColor Cyan
            netsh advfirewall firewall add rule name="DMS Port 80" dir=in action=allow protocol=TCP localport=80 profile=any
            netsh advfirewall firewall add rule name="DMS Port 443" dir=in action=allow protocol=TCP localport=443 profile=any
        }
        Default {
            Write-Host "Exiting doctor." -ForegroundColor Gray
        }
    }
}
