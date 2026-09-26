# =============================================================================
# DMS-O2 Background Autostart Service
# =============================================================================
# Ensures Docker Desktop is running and automatically brings up the DMS-O2
# container stack in the background on Windows boot / user login.
# =============================================================================

$projectDir = "D:\dms-o2"
$logDir = Join-Path $projectDir "logs"
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }
$logFile = Join-Path $logDir "autostart.log"

function Log-Msg([string]$msg) {
    $ts = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    $line = "[$ts] $msg"
    Add-Content -Path $logFile -Value $line -Force
}

Log-Msg "=== DMS-O2 Autostart Initialized ==="

# 1. Ensure Docker Desktop is launched
$dockerProcess = Get-Process "com.docker.backend" -ErrorAction SilentlyContinue
if (-not $dockerProcess) {
    Log-Msg "Docker Desktop process not found. Launching Docker Desktop..."
    $dockerExe = "C:\Users\TOOL ROOM 1\AppData\Local\Programs\DockerDesktop\Docker Desktop.exe"
    if (Test-Path $dockerExe) {
        Start-Process $dockerExe
    } else {
        $fallback = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
        if (Test-Path $fallback) { Start-Process $fallback }
    }
} else {
    Log-Msg "Docker Desktop process is already running."
}

# 2. Wait for Docker daemon to become responsive (up to 120s)
Log-Msg "Waiting for Docker daemon to become responsive..."
$maxAttempts = 24 # 24 * 5s = 120s
$attempt = 0
$dockerReady = $false

while ($attempt -lt $maxAttempts) {
    $attempt++
    docker info 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
        $dockerReady = $true
        Log-Msg "Docker daemon is responsive (attempt $attempt)."
        break
    }
    Start-Sleep -Seconds 5
}

if (-not $dockerReady) {
    Log-Msg "ERROR: Timed out waiting for Docker engine after 120 seconds."
    exit 1
}

# 3. Bring up DMS-O2 container stack
Log-Msg "Bringing up DMS-O2 containers via 'docker compose up -d'..."
Set-Location $projectDir
docker compose up -d 2>&1 | ForEach-Object { Log-Msg "compose: $_" }

# 4. Probe live endpoint
Start-Sleep -Seconds 10
$curlResult = curl.exe -k -s -o /dev/null -w "%{http_code}" --max-time 5 https://127.0.0.1 2>$null
if ($curlResult -eq "200") {
    Log-Msg "SUCCESS: DMS-O2 is operational and serving HTTP 200 on port 443."
} else {
    Log-Msg "INFO: Containers initialized. Traefik returned status '$curlResult' (startup warming up)."
}

Log-Msg "=== DMS-O2 Autostart Finished ==="
