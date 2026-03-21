@echo off
echo ========================================
echo  Governance Service - Phases 5-10
echo ========================================
echo.

cd /d "%~dp0"

echo [1/3] Installing dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo [2/3] Starting Governance Service...
echo.
echo Service will run on: http://localhost:5003
echo Health check: http://localhost:5003/health
echo.

start "Governance Service" cmd /k "npm start"

echo.
echo [3/3] Service started!
echo.
echo Press any key to exit...
pause > nul
