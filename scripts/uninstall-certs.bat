@echo off
setlocal

echo ======================================================
echo >>> Uninstalling TLS Certificates ^& Root CA
echo ======================================================
echo.

rem 1. Uninstall the Root CA from the OS trust store
call mkcert -uninstall >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Successfully uninstalled Root CA from system trust store.
) else (
    echo [WARNING] Could not run 'mkcert -uninstall'. You may need to run this command manually.
)

rem 2. Delete generated files from certs directory
set CERTS_DIR=%~dp0..\certs
if exist "%CERTS_DIR%" (
    echo Cleaning certs directory...
    del /q "%CERTS_DIR%\*.*" >nul 2>&1
    echo [OK] Removed all certificate files from %CERTS_DIR%\
)

echo.
echo Uninstall completed successfully!
echo ======================================================
pause
