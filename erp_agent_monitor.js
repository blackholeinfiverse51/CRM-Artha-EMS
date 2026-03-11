// erp_agent_monitor.js
// Day 4: Autonomous Monitoring Agent Layer
// SAFETY: This agent ONLY proposes actions, NEVER executes them

'use strict';

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Configuration
const CONFIG = {
  MONITOR_INTERVAL_MS: 5 * 60 * 1000, // 5 minutes
  IDLE_THRESHOLD_HOURS: 2,
  API_BASE_URL: process.env.ERP_API_URL || 'http://localhost:5001',
  PROPOSAL_ENDPOINT: '/api/agent/propose-action',
};

// Database connection (assume initialized)
const db = require('./db');

// ============================================================================
// TRACE ID GENERATION
// ============================================================================

function generateTraceId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 6);
  return `trace_${timestamp}_${random}`;
}

// ============================================================================
// PROPOSAL SENDER
// ============================================================================

async function proposeAgentAction(employeeId, actionType, actionPayload, reason = null) {
  const traceId = generateTraceId();
  
  const payload = {
    trace_id: uuidv4(), // Use UUID v4 for compliance with endpoint validation
    employee_id: employeeId,
    action_type: actionType,
    action_payload: actionPayload,
    proposed_by: 'ERP_MONITOR_AGENT',
    reason: reason,
    requested_at: new Date().toISOString(),
  };

  try {
    const response = await axios.post(
      `${CONFIG.API_BASE_URL}${CONFIG.PROPOSAL_ENDPOINT}`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Trace-Id': payload.trace_id,
        },
        timeout: 10000,
      }
    );

    console.log(`[Agent Monitor] ✓ Proposal sent successfully`, {
      trace_id: payload.trace_id,
      action_type: actionType,
      employee_id: employeeId,
      proposal_id: response.data.proposal_id,
    });

    return response.data;
  } catch (error) {
    console.error(`[Agent Monitor] ✗ Failed to send proposal`, {
      trace_id: payload.trace_id,
      action_type: actionType,
      error: error.message,
    });
    throw error;
  }
}

// ============================================================================
// MONITORING RULE 1: EMPLOYEE IDLE DETECTION
// ============================================================================

async function checkEmployeeIdle() {
  console.log('[Agent Monitor] Checking employee inactivity...');

  try {
    const idleThreshold = new Date(Date.now() - CONFIG.IDLE_THRESHOLD_HOURS * 60 * 60 * 1000);

    const idleEmployees = await db('employee_activity')
      .select('employee_id', 'last_activity_timestamp')
      .where('last_activity_timestamp', '<', idleThreshold)
      .whereNotNull('employee_id');

    for (const employee of idleEmployees) {
      const hoursSinceActivity = Math.floor(
        (Date.now() - new Date(employee.last_activity_timestamp).getTime()) / (1000 * 60 * 60)
      );

      await proposeAgentAction(
        employee.employee_id,
        'CHECK_EMPLOYEE_ACTIVITY',
        {
          reason: `Employee idle for more than ${hoursSinceActivity} hours`,
          employee_id: employee.employee_id,
          last_activity: employee.last_activity_timestamp,
        },
        `Employee has been inactive for ${hoursSinceActivity} hours`
      );
    }

    console.log(`[Agent Monitor] Idle check complete: ${idleEmployees.length} proposals generated`);
  } catch (error) {
    console.error('[Agent Monitor] Error in checkEmployeeIdle:', error.message);
  }
}

// ============================================================================
// MONITORING RULE 2: ATTENDANCE ANOMALY
// ============================================================================

async function checkAttendanceAnomaly() {
  console.log('[Agent Monitor] Checking attendance anomalies...');

  try {
    const today = new Date().toISOString().split('T')[0];

    // Find employees with system activity but no attendance record
    const anomalies = await db('employee_activity')
      .select('employee_activity.employee_id')
      .leftJoin('attendance', function() {
        this.on('employee_activity.employee_id', '=', 'attendance.employee_id')
          .andOn(db.raw('DATE(attendance.date) = ?', [today]));
      })
      .whereRaw('DATE(employee_activity.last_activity_timestamp) = ?', [today])
      .whereNull('attendance.id')
      .groupBy('employee_activity.employee_id');

    for (const anomaly of anomalies) {
      console.log(`[Agent Monitor] Attendance anomaly detected for ${anomaly.employee_id}`);

      await proposeAgentAction(
        anomaly.employee_id,
        'SEND_ATTENDANCE_ALERT',
        {
          message: 'Employee activity detected but attendance missing',
          employee_id: anomaly.employee_id,
          date: today,
        },
        'System activity detected without attendance record'
      );
    }

    console.log(`[Agent Monitor] Attendance check complete: ${anomalies.length} proposals generated`);
  } catch (error) {
    console.error('[Agent Monitor] Error in checkAttendanceAnomaly:', error.message);
  }
}

// ============================================================================
// MONITORING RULE 3: TASK DEADLINE VIOLATION
// ============================================================================

async function checkTaskDeadline() {
  console.log('[Agent Monitor] Checking task deadline violations...');

  try {
    const now = new Date();

    const overdueTasks = await db('tasks')
      .select('task_id', 'employee_id', 'deadline', 'task_status')
      .where('task_status', '!=', 'completed')
      .where('deadline', '<', now);

    for (const task of overdueTasks) {
      const daysOverdue = Math.floor(
        (now - new Date(task.deadline)) / (1000 * 60 * 60 * 24)
      );

      await proposeAgentAction(
        task.employee_id,
        'TASK_ESCALATION',
        {
          task_id: task.task_id,
          reason: 'Task deadline exceeded',
          days_overdue: daysOverdue,
          current_status: task.task_status,
        },
        `Task ${task.task_id} is ${daysOverdue} days overdue`
      );
    }

    console.log(`[Agent Monitor] Task deadline check complete: ${overdueTasks.length} proposals generated`);
  } catch (error) {
    console.error('[Agent Monitor] Error in checkTaskDeadline:', error.message);
  }
}

// ============================================================================
// MONITORING ORCHESTRATOR
// ============================================================================

async function runMonitoringCycle() {
  console.log('[Agent Monitor] ========================================');
  console.log('[Agent Monitor] Starting monitoring cycle at', new Date().toISOString());
  console.log('[Agent Monitor] ========================================');

  try {
    await checkEmployeeIdle();
    await checkAttendanceAnomaly();
    await checkTaskDeadline();
  } catch (error) {
    console.error('[Agent Monitor] Error in monitoring cycle:', error.message);
  }

  console.log('[Agent Monitor] Monitoring cycle complete\n');
}

// ============================================================================
// SCHEDULER
// ============================================================================

function startMonitoring() {
  console.log('[Agent Monitor] 🚀 ERP Agent Monitor started');
  console.log(`[Agent Monitor] Monitoring interval: ${CONFIG.MONITOR_INTERVAL_MS / 1000}s`);
  console.log(`[Agent Monitor] Idle threshold: ${CONFIG.IDLE_THRESHOLD_HOURS} hours`);
  console.log(`[Agent Monitor] API endpoint: ${CONFIG.API_BASE_URL}${CONFIG.PROPOSAL_ENDPOINT}`);
  console.log('[Agent Monitor] ========================================\n');

  // Run immediately on start
  runMonitoringCycle();

  // Schedule periodic checks
  setInterval(runMonitoringCycle, CONFIG.MONITOR_INTERVAL_MS);
}

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

process.on('SIGINT', () => {
  console.log('\n[Agent Monitor] Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[Agent Monitor] Shutting down gracefully...');
  process.exit(0);
});

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  startMonitoring,
  runMonitoringCycle,
  checkEmployeeIdle,
  checkAttendanceAnomaly,
  checkTaskDeadline,
  proposeAgentAction,
};

// Auto-start if run directly
if (require.main === module) {
  startMonitoring();
}
