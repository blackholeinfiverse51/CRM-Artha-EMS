@echo off
echo ========================================
echo Starting AI CRM + Workflow Integration
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [1/4] Starting Workflow Backend (Port 5001)...
start "Workflow Backend" cmd /k "cd workflow-blackhole\server && npm start"
timeout /t 3 /nobreak >nul

echo [2/4] Starting AI CRM Backend (Port 8000)...
start "AI CRM Backend" cmd /k "cd ai-crm\backend-nodejs && npm start"
timeout /t 3 /nobreak >nul

echo [3/4] Starting AI CRM Frontend (Port 3000)...
start "AI CRM Frontend" cmd /k "cd ai-crm\frontend && npm run dev"
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo All services started successfully!
echo ========================================
echo.
echo Services running:
echo - Workflow Backend:  http://localhost:5001
echo - AI CRM Backend:    http://localhost:8000
echo - AI CRM Frontend:   http://localhost:3000
echo.
echo To access the integrated system:
echo 1. Open http://localhost:3000 in your browser
echo 2. Login to AI CRM
echo 3. Navigate to "Infiverse" in the sidebar
echo 4. Click on "Workflow Monitoring" tab
echo.
echo Press any key to open AI CRM in browser...
pause >nul

start http://localhost:3000

echo.
echo To stop all services, close all command windows.
echo.
pause
