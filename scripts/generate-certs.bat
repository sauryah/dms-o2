@echo off
setlocal

set CERTS_DIR=%~dp0..\certs
if not exist "%CERTS_DIR%" mkdir "%CERTS_DIR%"

echo Detecting LAN IP...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4" ^| findstr /v "127.0.0.1"') do (
    for /f "tokens=*" %%b in ("%%a") do set LAN_IP=%%b
)
set LAN_IP=%LAN_IP: =%

if "%LAN_IP%"=="" (
    echo ERROR: Could not detect LAN IP.
    exit /b 1
)

echo Detected LAN IP: %LAN_IP%
echo Generating TLS certificates...

call mkcert -install 2>nul
call mkcert -cert-file "%CERTS_DIR%\cert.pem" -key-file "%CERTS_DIR%\key.pem" localhost 127.0.0.1 %LAN_IP% ::1

echo.
echo Certificates generated in %CERTS_DIR%\
echo   cert.pem  - server certificate (valid for %LAN_IP%)
echo   key.pem   - private key
echo.
echo Access your app at: https://%LAN_IP%
echo.
echo To access from another computer:
echo   1. Copy %CERTS_DIR%\rootCA.pem to the other computer
echo   2. Convert to .cer: openssl x509 -in rootCA.pem -outform DER -out rootCA.cer
echo   3. Install rootCA.cer in Trusted Root Certification Authorities
pause
