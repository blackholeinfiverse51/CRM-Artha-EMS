@echo off
echo Starting Agent History Service...
echo.

cd /d "C:\Users\A\Desktop\CRM-ERP\agent-history-service"

echo Installing dependencies...
call npm install

echo.
echo Starting service on port 5003...
echo Health check: http://localhost:5003/health
echo API endpoint: http://localhost:5003/api/agent/action-history
echo.

call npm start