@echo off
echo ========================================
echo  Agent History Service with Traceability
echo ========================================
echo.

cd /d "C:\Users\A\Desktop\CRM-ERP\agent-history-service"

echo Installing dependencies...
call npm install

echo.
echo Starting Enhanced Agent History Service...
echo.
echo 🔍 Traceability Features:
echo   - End-to-end trace ID propagation
echo   - Governance rule enforcement
echo   - Complete audit logging
echo   - Cross-system integration
echo.
echo 🌐 Service Endpoints:
echo   Health Check: http://localhost:5003/health
echo   Action History: http://localhost:5003/api/agent/action-history
echo   Trace Lifecycle: http://localhost:5003/api/agent/trace/:trace_id
echo   Governance Validation: http://localhost:5003/api/agent/governance/validate/:trace_id
echo   Traceability Info: http://localhost:5003/api/traceability/info
echo.
echo 🛡️ Governance Rules Enforced:
echo   1. AI cannot execute actions directly
echo   2. Execution requires approval
echo   3. All executions must be logged
echo   4. All actions must be recoverable
echo.

call npm start