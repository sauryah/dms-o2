@echo off
setlocal enabledelayedexpansion

echo ========================================================================
echo DMS-O2 Certificate Installer for Windows
echo ========================================================================
echo.

:: 1. Self-elevation check: Root CA installation requires Admin access to write to LocalMachine\Root
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [i] Requesting administrator privileges to install certificates...
    powershell -Command "Start-Process -FilePath '%~0' -ArgumentList '%~1' -Verb RunAs"
    exit /b
)

:: Get the directory where this script is located
set SCRIPT_DIR=%~dp0
set CLIENT_NAME={{CLIENT_NAME}}
set CLIENT_PFX=%SCRIPT_DIR%client-%CLIENT_NAME%.p12
set ROOT_CA=%SCRIPT_DIR%rootCA.cer

echo [*] Installing client certificate for: %CLIENT_NAME%

:: 2. Install Client Certificate (.p12) to Current User's Personal store
if exist "%CLIENT_PFX%" (
    echo [*] Importing client certificate to Personal store...
    powershell -Command "Import-PfxCertificate -FilePath '%CLIENT_PFX%' -CertStoreLocation 'Cert:\CurrentUser\My' -Password (New-Object System.Security.SecureString)" >nul 2>&1
    if !errorlevel! equ 0 (
        echo [OK] Client certificate installed successfully.
    ) else (
        echo [ERROR] Failed to install client certificate.
    )
) else (
    echo [ERROR] Client certificate file not found: client-%CLIENT_NAME%.p12
)

:: 3. Install Root CA to Local Machine's Trusted Root store
if exist "%ROOT_CA%" (
    echo [*] Importing Root CA to Trusted Root Certification Authorities...
    powershell -Command "Import-Certificate -FilePath '%ROOT_CA%' -CertStoreLocation 'Cert:\LocalMachine\Root'" >nul 2>&1
    if !errorlevel! equ 0 (
        echo [OK] Root CA certificate installed successfully.
    ) else (
        echo [ERROR] Failed to install Root CA certificate.
    )
) else (
    echo [WARNING] Root CA file (rootCA.cer) not found in this folder.
    echo If this is a secondary client machine, copy rootCA.cer from the server's certs/ directory.
)

echo.
echo ========================================================================
echo Installation complete! 
echo IMPORTANT: Please restart your browser completely for the changes to take effect.
echo When you visit the site, select the certificate named "client-%CLIENT_NAME%".
echo ========================================================================
echo.
pause
