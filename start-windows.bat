@echo off
title PulsePath Emergency Command System
echo ========================================================
echo   PULSEPATH // SMART EMERGENCY CORRIDOR & BED TRIAGE
echo ========================================================
echo.

where npm >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Node.js and npm detected!
    if not exist node_modules (
        echo [1/2] Installing dependencies...
        call npm install
    )
    echo [2/2] Starting local dev server...
    start http://localhost:3000
    call npm run dev
) else (
    echo [!] Node.js is not installed on this computer.
    echo [*] Launching standalone browser version directly...
    start standalone.html
)
pause
