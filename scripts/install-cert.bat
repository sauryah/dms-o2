@echo off
echo ============================================
echo  DMS Certificate Installer (Run as Admin)
echo ============================================
echo.
echo This script installs the DMS root CA certificate
echo so your browser trusts the HTTPS connection.
echo.
echo Looking for rootCA.cer in parent certs folder...
set CERT_FILE=%~dp0..\certs\rootCA.cer
if not exist "%CERT_FILE%" (
    set CERT_FILE=%~dp0rootCA.cer
)
if not exist "%CERT_FILE%" (
    echo ERROR: rootCA.cer not found!
    echo Copy rootCA.cer to the same folder as this script, or to certs\
    pause
    exit /b 1
)
echo Installing %CERT_FILE% to Trusted Root store...
certutil -addstore -f "Root" "%CERT_FILE%"
echo.
echo Now CLOSE ALL browser windows completely and reopen.
echo Then visit https://your-server-ip in your browser.
pause
