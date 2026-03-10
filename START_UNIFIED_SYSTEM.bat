@echo off
echo ========================================
echo  UNIFIED CRM-ERP-FINANCE SYSTEM STARTUP
echo ========================================
echo.
echo Starting all services...
echo - Workflow Backend (Port 5001)
echo - AI CRM Backend (Port 8000)
echo - AI CRM Frontend (Port 3000)
echo - Artha Finance Backend (Port 5002)
echo.

REM Start Workflow Backend
echo [1/4] Starting Workflow Backend...
start "Workflow Backend" cmd /k "cd workflow-blackhole\server && npm start"
timeout /t 3 /nobreak >nul

REM Start AI CRM Backend
echo [2/4] Starting AI CRM Backend...
start "AI CRM Backend" cmd /k "cd ai-crm\backend-nodejs && npm start"
timeout /t 3 /nobreak >nul

REM Start Artha Finance Backend
echo [3/4] Starting Artha Finance Backend...
start "Artha Finance Backend" cmd /k "cd artha-finance\backend && npm start"
timeout /t 3 /nobreak >nul

REM Start AI CRM Frontend
echo [4/4] Starting AI CRM Frontend...
start "AI CRM Frontend" cmd /k "cd ai-crm\frontend && npm run dev"
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo  ALL SERVICES STARTED!
echo ========================================
echo.
echo Access Points:
echo - AI CRM Frontend: http://localhost:3000
echo - Workflow API: http://localhost:5001/api
echo - AI CRM API: http://localhost:8000
echo - Artha Finance API: http://localhost:5002/api
echo.
echo Database: MongoDB Atlas (blackhole_db)
echo.
echo Press any key to exit...
pause >nul
