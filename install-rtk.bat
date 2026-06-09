@echo off
setlocal enabledelayedexpansion

set "NPM_DIR=%APPDATA%\npm"
set "RTK_PATH=%NPM_DIR%\rtk.exe"
set "VERSION=dev-0.43.0-rc.271"
set "URL=https://github.com/rtk-ai/rtk/releases/download/%VERSION%/rtk-x86_64-pc-windows-msvc.zip"
set "TEMP_ZIP=%TEMP%\rtk-installer.zip"
set "TEMP_DIR=%TEMP%\rtk-extract"

echo === RTK Installer ===
echo.

REM Remove old version if exists
if exist "%RTK_PATH%" (
    del "%RTK_PATH%" >nul 2>&1
)

REM Create directory
if not exist "%NPM_DIR%" (
    echo [*] Creating npm directory...
    mkdir "%NPM_DIR%"
)

REM Download ZIP
echo [*] Downloading RTK %VERSION%...
curl -L -o "%TEMP_ZIP%" "%URL%"

if not exist "%TEMP_ZIP%" (
    echo [ERROR] Download failed - check internet connection
    exit /b 1
)
echo [OK] Downloaded

REM Extract ZIP
echo [*] Extracting...
if exist "%TEMP_DIR%" (
    rmdir /s /q "%TEMP_DIR%" >nul 2>&1
)
mkdir "%TEMP_DIR%"
powershell -Command "Expand-Archive -Path '%TEMP_ZIP%' -DestinationPath '%TEMP_DIR%' -Force" >nul 2>&1
if !errorlevel! neq 0 (
    echo [ERROR] Extraction failed
    del "%TEMP_ZIP%" >nul 2>&1
    rmdir /s /q "%TEMP_DIR%" >nul 2>&1
    exit /b 1
)
echo [OK] Extracted

REM Install
echo [*] Installing...
copy /y "%TEMP_DIR%\rtk.exe" "%RTK_PATH%" >nul 2>&1
if !errorlevel! neq 0 (
    echo [ERROR] Installation failed
    del "%TEMP_ZIP%" >nul 2>&1
    rmdir /s /q "%TEMP_DIR%" >nul 2>&1
    exit /b 1
)
echo [OK] Installed

REM Cleanup
del "%TEMP_ZIP%" >nul 2>&1
rmdir /s /q "%TEMP_DIR%" >nul 2>&1

REM Verify
echo [*] Verifying...
"%RTK_PATH%" --version >nul 2>&1
if !errorlevel! neq 0 (
    echo [ERROR] Verification failed
    exit /b 1
)
"%RTK_PATH%" --version
echo [OK] RTK works

REM Add to PATH
echo [*] Adding to PATH...
for /f "tokens=2*" %%a in ('reg query HKCU\Environment /v PATH 2^>nul') do set "OLD_PATH=%%b"

if "!OLD_PATH!"=="" (
    setx PATH "%NPM_DIR%" >nul 2>&1
) else (
    echo !OLD_PATH! | findstr /i "%NPM_DIR%" >nul 2>&1
    if !errorlevel! neq 0 (
        setx PATH "!OLD_PATH!;%NPM_DIR%" >nul 2>&1
    )
)
echo [OK] PATH updated

echo.
echo === Installation Complete ===
echo Open new terminal and run: rtk --version
echo.
pause
