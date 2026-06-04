@echo off
setlocal enabledelayedexpansion

set "NPM_DIR=%APPDATA%\npm"
set "RTK_PATH=%NPM_DIR%\rtk.exe"
set "VERSION=0.42.0"
set "URL=https://github.com/reachingforthejack/rtk/releases/download/v%VERSION%/rtk-x86_64-pc-windows-msvc.exe"
set "TEMP_FILE=%TEMP%\rtk-installer.exe"

echo === RTK Installer ===
echo.

REM Check if installed
if exist "%RTK_PATH%" (
    echo [OK] RTK already installed
    "%RTK_PATH%" --version
    exit /b 0
)

REM Create directory
if not exist "%NPM_DIR%" (
    echo [*] Creating npm directory...
    mkdir "%NPM_DIR%"
)

REM Download using curl (native in Windows 10+)
echo [*] Downloading RTK v%VERSION%...
curl -L -o "%TEMP_FILE%" "%URL%" 2>/dev/null

if not exist "%TEMP_FILE%" (
    echo [ERROR] Download failed - check internet connection
    exit /b 1
)
echo [OK] Downloaded

REM Install
echo [*] Installing...
copy "%TEMP_FILE%" "%RTK_PATH%" >/dev/null 2>&1
if !errorlevel! neq 0 (
    echo [ERROR] Installation failed
    del "%TEMP_FILE%" >/dev/null 2>&1
    exit /b 1
)
del "%TEMP_FILE%" >/dev/null 2>&1
echo [OK] Installed

REM Verify
echo [*] Verifying...
"%RTK_PATH%" --version >/dev/null 2>&1
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
    setx PATH "%NPM_DIR%" >/dev/null 2>&1
) else (
    echo !OLD_PATH! | findstr /i "%NPM_DIR%" >/dev/null 2>&1
    if !errorlevel! neq 0 (
        setx PATH "!OLD_PATH!;%NPM_DIR%" >/dev/null 2>&1
    )
)
echo [OK] PATH updated

echo.
echo === Installation Complete ===
echo Open new terminal and run: rtk --version
echo.
pause
