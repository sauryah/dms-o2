@echo off
setlocal

if "%~1"=="" (
    echo Usage: generate-client-cert.bat [client_name]
    echo Example: generate-client-cert.bat john-laptop
    exit /b 1
)

set CLIENT_NAME=%~1
set CERTS_DIR=%~dp0..\certs

rem Verify mkcert is installed and this is the server
call mkcert -CAROOT >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ERROR: mkcert command was not found.
    echo This script must be run on the main DMS server where mkcert is installed.
    echo.
    pause
    exit /b 1
)

echo Generating client certificate for %CLIENT_NAME%...
call mkcert -client -cert-file "%CERTS_DIR%\client-%CLIENT_NAME%.pem" -key-file "%CERTS_DIR%\client-%CLIENT_NAME%-key.pem" localhost 127.0.0.1 ::1

echo Exporting certificate to PKCS#12 format (.p12)...
for /f "tokens=*" %%i in ('mkcert -CAROOT') do set CAROOT=%%i

rem Detect openssl
set OPENSSL_CMD=openssl
where %OPENSSL_CMD% >nul 2>nul
if %errorlevel% equ 0 goto openssl_found

set OPENSSL_CMD=C:\Program Files\Git\usr\bin\openssl.exe
if exist "%OPENSSL_CMD%" goto openssl_found

set OPENSSL_CMD=C:\Program Files (x86)\Git\usr\bin\openssl.exe
if exist "%OPENSSL_CMD%" goto openssl_found

set OPENSSL_CMD=
goto openssl_not_found

:openssl_found
"%OPENSSL_CMD%" pkcs12 -export -out "%CERTS_DIR%\client-%CLIENT_NAME%.p12" -inkey "%CERTS_DIR%\client-%CLIENT_NAME%-key.pem" -in "%CERTS_DIR%\client-%CLIENT_NAME%.pem" -certfile "%CAROOT%\rootCA.pem" -passout pass:
goto generate_instructions

:generate_instructions
rem Generate companion instruction file from template
powershell -Command "$inst = [System.IO.File]::ReadAllText('scripts\client-instructions-template.txt'); $inst = $inst.Replace('{{CLIENT_NAME}}', '%CLIENT_NAME%'); [System.IO.File]::WriteAllText('%CERTS_DIR%\client-%CLIENT_NAME%-INSTRUCTIONS.txt', $inst)"

echo.
echo Client certificate successfully generated!
echo Deliver these files securely to the client device:
echo   %CERTS_DIR%\client-%CLIENT_NAME%.p12
echo   %CERTS_DIR%\client-%CLIENT_NAME%-INSTRUCTIONS.txt
echo.
goto end

:openssl_not_found
echo.
echo WARNING: openssl command not found.
echo Please install OpenSSL or ensure Git is installed to export to .p12 format.
echo The PEM files (client-%CLIENT_NAME%.pem and client-%CLIENT_NAME%-key.pem) were created in:
echo   %CERTS_DIR%\
echo.
goto end

:end
pause
