# =============================================================================
# DMS-O2 Autostart Installer
# =============================================================================
# Installs a silent Windows startup launcher so DMS-O2 automatically boots
# and verifies container health every time the computer/user starts up.
# =============================================================================

$projectDir = "D:\dms-o2"
$scriptPath = Join-Path $projectDir "scripts\autostart.ps1"
$startupFolder = [Environment]::GetFolderPath('Startup')
$vbsPath = Join-Path $startupFolder "DMS-O2-Autostart.vbs"

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "         DMS-O2 Automatic Startup Installer           " -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $scriptPath)) {
    Write-Host "[ERROR] autostart.ps1 not found at $scriptPath" -ForegroundColor Red
    exit 1
}

# 1. Create silent VBScript launcher in Windows Startup folder
$vbsContent = @"
' DMS-O2 Silent Autostart Launcher
Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""$scriptPath""", 0, False
"@

[System.IO.File]::WriteAllText($vbsPath, $vbsContent)
Write-Host "[PASS] Silent startup launcher registered:" -ForegroundColor Green
Write-Host "       $vbsPath" -ForegroundColor Gray

# 2. Create Desktop Shortcut for manual 1-click start
try {
    $desktopFolder = [Environment]::GetFolderPath('Desktop')
    $shortcutPath = Join-Path $desktopFolder "Start DMS-O2.lnk"
    $wsh = New-Object -ComObject WScript.Shell
    $shortcut = $wsh.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = "powershell.exe"
    $shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File ""$scriptPath"""
    $shortcut.WorkingDirectory = $projectDir
    $shortcut.Description = "Start DMS-O2 Server and Containers"
    $shortcut.Save()
    Write-Host "[PASS] Desktop shortcut created:" -ForegroundColor Green
    Write-Host "       $shortcutPath" -ForegroundColor Gray
} catch {
    Write-Host "[INFO] Desktop shortcut creation skipped." -ForegroundColor Gray
}

Write-Host ""
Write-Host ">>> DMS-O2 is now configured to start automatically on Windows boot! <<<" -ForegroundColor Green
Write-Host "    - Docker Desktop will be checked/started" -ForegroundColor Gray
Write-Host "    - Containers will be brought up via 'docker compose up -d'" -ForegroundColor Gray
Write-Host "    - Log file will be updated at D:\dms-o2\logs\autostart.log" -ForegroundColor Gray
Write-Host ""
