@echo off
echo ========================================
echo Starting Unified CRM-ERP-Finance System
echo With Governance Service
echo ========================================
echo.

echo Starting Workflow Backend (Port 5001)...
start cmd /k "cd workflow-blackhole\server && npm start"
timeout /t 3 /nobreak >nul

echo Starting AI CRM Backend (Port 8000)...
start cmd /k "cd ai-crm\backend-nodejs && npm start"
timeout /t 3 /nobreak >nul

echo Starting Artha Finance Backend (Port 5002)...
start cmd /k "cd artha-finance\backend && npm start"
timeout /t 3 /nobreak >nul

echo Starting Governance Service (Port 5003)...
start cmd /k "cd governance-service && npm start"
timeout /t 3 /nobreak >nul

echo Starting AI CRM Frontend (Port 3000)...
start cmd /k "cd ai-crm\frontend && npm run dev"

echo.
echo ========================================
echo All services started!
echo ========================================
echo.
echo Access Points:
echo - Frontend:    http://localhost:3000
echo - Workflow:    http://localhost:5001/api
echo - AI CRM:      http://localhost:8000
echo - Finance:     http://localhost:5002/api
echo - Governance:  http://localhost:5003/api/governance
echo.
echo Press any key to exit...
pause >nul
