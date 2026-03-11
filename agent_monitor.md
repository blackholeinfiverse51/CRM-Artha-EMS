# 🤖 ERP Agent Monitor Documentation

## Overview

The **ERP Agent Monitor** is an autonomous monitoring service that continuously observes ERP system data to detect anomalies, violations, and system events. It operates under a strict **Human-in-Loop AI architecture** where:

- ✅ **AI can ONLY propose actions**
- ✅ **Humans MUST approve actions**
- ✅ **Execution happens through Workflow Executor**
- ❌ **AI NEVER executes actions directly**

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    ERP Database                          │
│  (employees, attendance, tasks, employee_activity)       │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ Monitored by (every 5 min)
                     ▼
┌─────────────────────────────────────────────────────────┐
│              erp_agent_monitor.js                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Rule 1: Employee Idle Detection                │   │
│  │  Rule 2: Attendance Anomaly                     │   │
│  │  Rule 3: Task Deadline Violation                │   │
│  └─────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ Generates proposal
                     ▼
┌─────────────────────────────────────────────────────────┐
│         POST /api/agent/propose-action                   │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│           agent_action_proposals table                   │
│              Status: PENDING_APPROVAL                    │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Human Approval Interface                    │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Workflow Executor                           │
│           (Executes approved actions)                    │
└─────────────────────────────────────────────────────────┘
```

---

## Monitoring Rules

### Rule 1: Employee Idle Detection

**Condition:**
```sql
SELECT * FROM employee_activity 
WHERE last_activity_timestamp < NOW() - INTERVAL '2 hours'
```

**Trigger:** Employee has no system activity for more than 2 hours

**Action Proposal:**
- **action_type:** `CHECK_EMPLOYEE_ACTIVITY`
- **Payload:**
  ```json
  {
    "reason": "Employee idle for more than 3 hours",
    "employee_id": "EMP123",
    "last_activity": "2025-01-15T10:30:00.000Z"
  }
  ```

**Business Logic:**
- Detects potential productivity issues
- Identifies employees who may need assistance
- Flags potential system access issues

---

### Rule 2: Attendance Anomaly

**Condition:**
```sql
SELECT ea.employee_id 
FROM employee_activity ea
LEFT JOIN attendance a 
  ON ea.employee_id = a.employee_id 
  AND DATE(a.date) = CURRENT_DATE
WHERE DATE(ea.last_activity_timestamp) = CURRENT_DATE
  AND a.id IS NULL
```

**Trigger:** Employee has system activity but no attendance record for today

**Action Proposal:**
- **action_type:** `SEND_ATTENDANCE_ALERT`
- **Payload:**
  ```json
  {
    "message": "Employee activity detected but attendance missing",
    "employee_id": "EMP102",
    "date": "2025-01-15"
  }
  ```

**Business Logic:**
- Ensures attendance compliance
- Detects forgotten attendance marking
- Maintains accurate attendance records

---

### Rule 3: Task Deadline Violation

**Condition:**
```sql
SELECT * FROM tasks 
WHERE task_status != 'completed' 
  AND deadline < NOW()
```

**Trigger:** Task is incomplete and past its deadline

**Action Proposal:**
- **action_type:** `TASK_ESCALATION`
- **Payload:**
  ```json
  {
    "task_id": "TASK456",
    "reason": "Task deadline exceeded",
    "days_overdue": 3,
    "current_status": "in_progress"
  }
  ```

**Business Logic:**
- Escalates overdue tasks
- Ensures project timeline compliance
- Triggers management intervention

---

## Safety Model

### Core Safety Principles

1. **Observation Only**
   - Monitor reads data from database
   - Never modifies ERP data directly
   - Never deletes or updates records

2. **Proposal Generation**
   - Creates action proposals with context
   - Sends to approval endpoint
   - Waits for human decision

3. **No Direct Execution**
   - Never calls Workflow Executor
   - Never triggers automated actions
   - Never bypasses approval flow

4. **Traceability**
   - Every proposal has unique `trace_id`
   - Full audit trail maintained
   - Governance-ready architecture

### Safety Constraints Enforced

```javascript
// ❌ FORBIDDEN OPERATIONS
- db('employees').update({...})
- db('tasks').delete()
- executeWorkflow(action)
- approveAction(proposalId)

// ✅ ALLOWED OPERATIONS
- db('employees').select()
- proposeAgentAction(...)
- axios.post('/api/agent/propose-action', {...})
```

---

## Configuration

### Environment Variables

```env
# API Configuration
ERP_API_URL=http://localhost:5001

# Monitoring Settings
MONITOR_INTERVAL_MS=300000  # 5 minutes
IDLE_THRESHOLD_HOURS=2

# Database Connection
DB_HOST=localhost
DB_PORT=5432
DB_NAME=blackhole_db
DB_USER=<user>
DB_PASSWORD=<password>
```

### Monitoring Interval

Default: **5 minutes**

Adjust based on:
- System load
- Business requirements
- Database performance

```javascript
const CONFIG = {
  MONITOR_INTERVAL_MS: 5 * 60 * 1000, // 5 minutes
};
```

---

## Installation & Setup

### 1. Install Dependencies

```bash
cd C:\Users\A\Desktop\CRM-ERP
npm install axios uuid
```

### 2. Configure Database

Ensure these tables exist:
- `employee_activity` (employee_id, last_activity_timestamp)
- `attendance` (employee_id, date)
- `tasks` (task_id, employee_id, deadline, task_status)
- `agent_action_proposals` (created by proposal endpoint)

### 3. Start Monitor

**Option A: Standalone**
```bash
node erp_agent_monitor.js
```

**Option B: Integrated with Backend**
```javascript
// In your main server.js
const { startMonitoring } = require('./erp_agent_monitor');

// After server starts
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startMonitoring(); // Start monitoring
});
```

---

## Logging & Monitoring

### Log Format

```
[Agent Monitor] 🚀 ERP Agent Monitor started
[Agent Monitor] Monitoring interval: 300s
[Agent Monitor] ========================================
[Agent Monitor] Starting monitoring cycle at 2025-01-15T14:00:00.000Z
[Agent Monitor] Checking employee inactivity...
[Agent Monitor] Idle check complete: 2 proposals generated
[Agent Monitor] ✓ Proposal sent successfully {
  trace_id: '550e8400-e29b-41d4-a716-446655440000',
  action_type: 'CHECK_EMPLOYEE_ACTIVITY',
  employee_id: 'EMP123',
  proposal_id: 42
}
[Agent Monitor] Monitoring cycle complete
```

### Error Handling

All errors are logged but do not stop the monitoring service:

```javascript
try {
  await checkEmployeeIdle();
} catch (error) {
  console.error('[Agent Monitor] Error in checkEmployeeIdle:', error.message);
  // Continue with next rule
}
```

---

## Proposal Flow

### Step-by-Step Process

1. **Detection**
   ```javascript
   const idleEmployees = await db('employee_activity')
     .where('last_activity_timestamp', '<', idleThreshold);
   ```

2. **Proposal Generation**
   ```javascript
   await proposeAgentAction(
     employee.employee_id,
     'CHECK_EMPLOYEE_ACTIVITY',
     { reason: 'Employee idle for 3 hours' }
   );
   ```

3. **API Submission**
   ```javascript
   POST /api/agent/propose-action
   {
     "trace_id": "550e8400-...",
     "employee_id": "EMP123",
     "action_type": "CHECK_EMPLOYEE_ACTIVITY",
     "status": "proposed"
   }
   ```

4. **Database Storage**
   ```sql
   INSERT INTO agent_action_proposals (
     trace_id, employee_id, action_type, status
   ) VALUES (...);
   ```

5. **Human Review**
   - Manager reviews proposal in dashboard
   - Approves or rejects with reason

6. **Execution (if approved)**
   - Workflow Executor processes action
   - Updates proposal status to `executed`

---

## Testing

### Manual Test

```bash
# Start monitor
node erp_agent_monitor.js

# Insert test data
psql -d blackhole_db -c "
  INSERT INTO employee_activity (employee_id, last_activity_timestamp)
  VALUES ('TEST001', NOW() - INTERVAL '3 hours');
"

# Wait for next monitoring cycle (max 5 minutes)
# Check logs for proposal generation
```

### API Test

```bash
# Verify proposal endpoint is accessible
curl -X POST http://localhost:5001/api/agent/propose-action \
  -H "Content-Type: application/json" \
  -d '{
    "trace_id": "550e8400-e29b-41d4-a716-446655440000",
    "employee_id": "TEST001",
    "action_type": "CHECK_EMPLOYEE_ACTIVITY",
    "action_payload": {"reason": "Test"},
    "proposed_by": "ERP_MONITOR_AGENT"
  }'
```

---

## Extending the Monitor

### Adding New Rules

```javascript
// 1. Create monitoring function
async function checkNewRule() {
  console.log('[Agent Monitor] Checking new rule...');
  
  const violations = await db('table_name')
    .where('condition', '=', 'value');
  
  for (const violation of violations) {
    await proposeAgentAction(
      violation.employee_id,
      'NEW_ACTION_TYPE',
      { /* payload */ },
      'Reason for proposal'
    );
  }
}

// 2. Add to monitoring cycle
async function runMonitoringCycle() {
  await checkEmployeeIdle();
  await checkAttendanceAnomaly();
  await checkTaskDeadline();
  await checkNewRule(); // Add here
}
```

---

## Production Considerations

### Performance

- **Database Indexing:** Ensure indexes on:
  - `employee_activity.last_activity_timestamp`
  - `attendance.date`
  - `tasks.deadline`

- **Query Optimization:** Use EXPLAIN ANALYZE to optimize queries

- **Rate Limiting:** Avoid overwhelming proposal endpoint

### Scalability

- **Horizontal Scaling:** Run multiple monitors with distributed locking
- **Queue System:** Use message queue for high-volume proposals
- **Caching:** Cache employee data to reduce DB load

### Monitoring

- **Health Checks:** Expose `/health` endpoint
- **Metrics:** Track proposals generated per cycle
- **Alerts:** Notify on monitoring failures

---

## Security

### Access Control

- Monitor runs with read-only database credentials
- API calls use internal service authentication
- No external API exposure

### Data Privacy

- Proposals contain minimal PII
- Audit logs maintained for compliance
- GDPR-compliant data handling

---

## Troubleshooting

### Monitor Not Starting

```bash
# Check database connection
node -e "require('./db').raw('SELECT 1').then(() => console.log('DB OK'))"

# Check API endpoint
curl http://localhost:5001/api/agent/propose-action
```

### No Proposals Generated

- Verify monitoring rules match your database schema
- Check if conditions are being met
- Review logs for errors

### Proposal Submission Failures

- Verify API endpoint is running
- Check network connectivity
- Review proposal payload format

---

## Version History

- **v1.0.0** (2025-01-15): Initial release with 3 monitoring rules
- Human-in-Loop architecture implemented
- Production-ready safety constraints

---

## Support

**Blackhole Infiverse Development Team**  
Email: blackholeems@gmail.com  
Office: Mumbai, Maharashtra 400104

---

**Status:** ✅ Production Ready  
**Architecture:** Human-in-Loop AI  
**Safety Level:** Maximum (Proposal-Only)
