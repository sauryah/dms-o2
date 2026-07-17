@echo off
setlocal

set CERTS_DIR=%~dp0..\certs
if not exist "%CERTS_DIR%" mkdir "%CERTS_DIR%"

echo Detecting LAN IP...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4" ^| findstr /v "127.0.0.1" ^| findstr /v "vEthernet" ^| findstr /v "Docker" ^| findstr /v "WSL" ^| findstr /v "Hyper"') do (
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

echo Copying root CA...
for /f "tokens=*" %%i in ('mkcert -CAROOT') do set CAROOT=%%i
if exist "%CAROOT%\rootCA.pem" (
    copy "%CAROOT%\rootCA.pem" "%CERTS_DIR%\rootCA.pem" /Y >nul
    certutil -decode "%CERTS_DIR%\rootCA.pem" "%CERTS_DIR%\rootCA.cer" >nul
    echo   rootCA.pem - root CA (PEM format)
    echo   rootCA.cer - root CA (DER format, for Windows import)
) else (
    echo   WARNING: Could not find rootCA.pem in mkcert CA store
)

echo.
echo Certificates generated in %CERTS_DIR%\
echo   cert.pem  - server certificate (valid for %LAN_IP%)
echo   key.pem   - private key
echo.
echo Access your app at: https://%LAN_IP%
echo.
echo To access from another computer:
echo   1. Copy rootCA.cer to the other computer
echo   2. Run: certutil -addstore -f "Root" rootCA.cer
echo   3. Restart browser and visit https://%LAN_IP%
pause
