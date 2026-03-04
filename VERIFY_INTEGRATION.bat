@echo off
echo ========================================
echo Integration Verification Test
echo ========================================
echo.

echo [1/5] Checking if Node.js is installed...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ FAIL: Node.js is not installed
    pause
    exit /b 1
)
echo ✅ PASS: Node.js is installed
node --version
echo.

echo [2/5] Checking if MongoDB connection string is configured...
if exist "workflow-blackhole\server\.env" (
    findstr /C:"MONGODB_URI" workflow-blackhole\server\.env >nul
    if %ERRORLEVEL% EQU 0 (
        echo ✅ PASS: MongoDB URI found in workflow backend
    ) else (
        echo ❌ FAIL: MongoDB URI not found in workflow backend
    )
) else (
    echo ❌ FAIL: workflow-blackhole\server\.env not found
)
echo.

echo [3/5] Checking if AI CRM frontend .env exists...
if exist "ai-crm\frontend\.env" (
    echo ✅ PASS: AI CRM frontend .env exists
    findstr /C:"VITE_WORKFLOW_API_URL" ai-crm\frontend\.env >nul
    if %ERRORLEVEL% EQU 0 (
        echo ✅ PASS: VITE_WORKFLOW_API_URL configured
    ) else (
        echo ❌ FAIL: VITE_WORKFLOW_API_URL not found
    )
) else (
    echo ❌ FAIL: ai-crm\frontend\.env not found
)
echo.

echo [4/5] Checking if integration route exists...
if exist "workflow-blackhole\server\routes\crmIntegration.js" (
    echo ✅ PASS: CRM integration route exists
) else (
    echo ❌ FAIL: CRM integration route not found
)
echo.

echo [5/5] Checking if Infiverse.jsx was modified...
if exist "ai-crm\frontend\src\pages\Infiverse.jsx" (
    findstr /C:"workflow-monitoring" ai-crm\frontend\src\pages\Infiverse.jsx >nul
    if %ERRORLEVEL% EQU 0 (
        echo ✅ PASS: Workflow monitoring tab added to Infiverse
    ) else (
        echo ⚠️  WARNING: Workflow monitoring tab may not be added
    )
) else (
    echo ❌ FAIL: Infiverse.jsx not found
)
echo.

echo ========================================
echo Verification Complete
echo ========================================
echo.
echo Next Steps:
echo 1. Run START_INTEGRATED_SYSTEM.bat to start all services
echo 2. Open http://localhost:3000 in your browser
echo 3. Login to AI CRM
echo 4. Navigate to Infiverse ^> Workflow Monitoring
echo.
pause
