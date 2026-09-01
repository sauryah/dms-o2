@echo off
setlocal
cd /d "%~dp0"

echo ======================================================
echo   DMS-O2 Windows Automated Setup
echo ======================================================
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup.ps1" %*

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Setup exited with status code %ERRORLEVEL%.
    pause
    exit /b %ERRORLEVEL%
)
