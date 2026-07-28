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

:: 4. Configure Browser Auto-Select Certificate Policies
echo.
echo [*] Configuring browser policies for automatic client certificate selection...
powershell -Command "$policies = @('HKLM:\SOFTWARE\Policies\Google\Chrome\AutoSelectCertificateForUrls', 'HKLM:\SOFTWARE\Policies\Microsoft\Edge\AutoSelectCertificateForUrls'); foreach ($path in $policies) { if (-not (Test-Path $path)) { New-Item -Path $path -Force | Out-Null }; $idx = 1; while (Get-ItemProperty -Path $path -Name $idx -ErrorAction SilentlyContinue) { $idx++ }; New-ItemProperty -Path $path -Name $idx -PropertyType String -Value '{\"pattern\":\"https://localhost\",\"filter\":{}}' -Force | Out-Null; $idx = 1; while (Get-ItemProperty -Path $path -Name $idx -ErrorAction SilentlyContinue) { $idx++ }; New-ItemProperty -Path $path -Name $idx -PropertyType String -Value '{\"pattern\":\"https://127.0.0.1\",\"filter\":{}}' -Force | Out-Null; $idx = 1; while (Get-ItemProperty -Path $path -Name $idx -ErrorAction SilentlyContinue) { $idx++ }; New-ItemProperty -Path $path -Name $idx -PropertyType String -Value '{\"pattern\":\"https://{{LAN_IP}}\",\"filter\":{}}' -Force | Out-Null }" >nul 2>&1
if !errorlevel! equ 0 (
    echo [OK] Chrome/Edge auto-select policies configured.
) else (
    echo [WARNING] Failed to configure Chrome/Edge auto-select policies.
)

reg add "HKLM\SOFTWARE\Policies\Mozilla\Firefox\Preferences" /v "security.default_personal_cert" /t REG_SZ /d "Select Automatically" /f >nul 2>&1
reg add "HKCU\SOFTWARE\Policies\Mozilla\Firefox\Preferences" /v "security.default_personal_cert" /t REG_SZ /d "Select Automatically" /f >nul 2>&1
if !errorlevel! equ 0 (
    echo [OK] Firefox auto-select policy configured.
) else (
    echo [WARNING] Failed to configure Firefox auto-select policy.
)

echo.
echo ========================================================================
echo Installation complete! 
echo IMPORTANT: Please restart your browser completely for the changes to take effect.
echo Browsers should now automatically select the "client-%CLIENT_NAME%" certificate.
echo ========================================================================
echo.
pause
