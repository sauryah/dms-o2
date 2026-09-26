# =============================================================================
# DMS-O2 Autostart Uninstaller
# =============================================================================
# Removes the Windows startup launcher and desktop shortcut.
# =============================================================================

$startupFolder = [Environment]::GetFolderPath('Startup')
$vbsPath = Join-Path $startupFolder "DMS-O2-Autostart.vbs"
$desktopFolder = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktopFolder "Start DMS-O2.lnk"

Write-Host "Removing DMS-O2 autostart configuration..." -ForegroundColor Yellow

if (Test-Path $vbsPath) {
    Remove-Item $vbsPath -Force
    Write-Host "[PASS] Removed startup launcher: $vbsPath" -ForegroundColor Green
} else {
    Write-Host "[INFO] Startup launcher was not found." -ForegroundColor Gray
}

if (Test-Path $shortcutPath) {
    Remove-Item $shortcutPath -Force
    Write-Host "[PASS] Removed desktop shortcut: $shortcutPath" -ForegroundColor Green
}

Write-Host "DMS-O2 will no longer start automatically on Windows boot." -ForegroundColor Cyan
