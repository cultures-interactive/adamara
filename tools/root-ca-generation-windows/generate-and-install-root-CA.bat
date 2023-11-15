@echo off
if not "%1"=="am_admin" (
    powershell -Command "Start-Process -Verb RunAs -FilePath '%0' -ArgumentList 'am_admin'"
    exit /b
)

cd /d "%~dp0"

mkcert -install

for /f "tokens=*" %%i in ('mkcert -CAROOT') do set CERT_PATH=%%i
mkdir "Root CA Installation Package"

copy mkcert.exe "Root CA Installation Package"
copy install-root-CA.bat_ "Root CA Installation Package\install-root-CA.bat"
copy "%CERT_PATH%\rootCA.pem" "Root CA Installation Package"

echo -------------------------------------------------------------------------------------
echo.
echo Add the following two lines to your .env file to use this root certificate authority:
echo.
echo SSL_GENERATE_ROOT_CERT=%CERT_PATH%\rootCA.pem
echo SSL_GENERATE_ROOT_KEY=%CERT_PATH%\rootCA-key.pem
echo.
echo -------------------------------------------------------------------------------------
echo.
echo To install this root certificate authority on other Windows devices:
echo.
echo 1. Copy "Root CA Installation Package" folder to an USB stick
echo 2. Attach USB stick to the other device
echo 3. Open USB stick and run install-root-CA.bat
echo 4. Detach USB stick
echo.
echo -------------------------------------------------------------------------------------
pause