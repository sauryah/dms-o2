# =============================================================================
# DMS-O2 Standalone Client Installer Builder (.exe)
# =============================================================================
# Compiles a standalone native Windows executable (DMS-Client-Setup.exe)
# with the Root CA certificate embedded directly inside the binary.
# =============================================================================

$projectDir = "D:\dms-o2"
$csc = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (-not (Test-Path $csc)) {
    $csc = "C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe"
}

if (-not (Test-Path $csc)) {
    Write-Host "[ERROR] .NET Framework C# compiler (csc.exe) not found." -ForegroundColor Red
    exit 1
}

$certFile = Join-Path $projectDir "certs\rootCA.cer"
if (-not (Test-Path $certFile)) {
    Write-Host "[ERROR] certs\rootCA.cer not found. Run generate_openssl_certs.ps1 first." -ForegroundColor Red
    exit 1
}

$sourceFile = Join-Path $projectDir "scripts\client-setup\Program.cs"
$manifestFile = Join-Path $projectDir "scripts\client-setup\app.manifest"
$outputExe = Join-Path $projectDir "DMS-Client-Setup.exe"

# 1. Detect current physical LAN IP and update Program.cs if needed
$lanIp = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    $_.IPAddress -notlike "127.*" -and
    $_.IPAddress -notlike "169.254.*" -and
    $_.InterfaceAlias -notmatch "Loopback|vEthernet|docker|WSL|Hyper"
} | Select-Object -First 1 -ExpandProperty IPAddress

if ($lanIp) {
    $code = Get-Content $sourceFile -Raw
    $code = $code -replace 'public const string ServerIp = ".*?";', "public const string ServerIp = `"$lanIp`";"
    [System.IO.File]::WriteAllText($sourceFile, $code)
}

Write-Host "Compiling standalone DMS-Client-Setup.exe with embedded certificate..." -ForegroundColor Cyan

# 2. Compile with csc.exe
$argsList = @(
    "/target:winexe",
    "/optimize+",
    "/platform:anycpu",
    "/win32manifest:`"$manifestFile`"",
    "/resource:`"$certFile`",rootCA.cer",
    "/r:System.dll",
    "/r:System.Windows.Forms.dll",
    "/r:System.Drawing.dll",
    "/r:System.Core.dll",
    "/out:`"$outputExe`"",
    "`"$sourceFile`""
)

$process = Start-Process -FilePath $csc -ArgumentList $argsList -NoNewWindow -Wait -PassThru

if ($process.ExitCode -eq 0 -and (Test-Path $outputExe)) {
    $size = (Get-Item $outputExe).Length / 1KB
    Write-Host ""
    Write-Host "======================================================" -ForegroundColor Green
    Write-Host "   SUCCESS: Standalone Installer Generated!           " -ForegroundColor Green
    Write-Host "======================================================" -ForegroundColor Green
    Write-Host "File: $outputExe ($([math]::Round($size, 1)) KB)" -ForegroundColor White
    Write-Host ""
    Write-Host "Instructions for other computers:" -ForegroundColor Cyan
    Write-Host "  1. Copy 'DMS-Client-Setup.exe' to any other computer (USB, network share, etc.)" -ForegroundColor White
    Write-Host "  2. Double-click to run (it has the SSL certificate embedded inside)" -ForegroundColor White
    Write-Host "  3. Click 'Setup Workstation' -> it configures certs, hosts, and desktop shortcut" -ForegroundColor White
    Write-Host "  4. Click 'Open DMS-O2' -> opens with a green padlock!" -ForegroundColor White

    # Also copy to desktop for quick access
    try {
        $desktopPath = [Environment]::GetFolderPath('Desktop')
        Copy-Item $outputExe (Join-Path $desktopPath "DMS-Client-Setup.exe") -Force
        Write-Host "  (Copied to your Desktop for quick sharing: Desktop\DMS-Client-Setup.exe)" -ForegroundColor Gray
    } catch {}
} else {
    Write-Host "[ERROR] Compilation failed with exit code $($process.ExitCode)" -ForegroundColor Red
    exit 1
}
