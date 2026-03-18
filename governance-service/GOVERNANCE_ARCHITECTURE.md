# 🛡️ Governance Lifecycle Architecture

## Overview

A 6-stage governance pipeline ensuring **no AI agent can execute actions directly**. Every action passes through structured, deterministic workflows with full auditability.

---

## 🔄 Lifecycle Stages

```
┌─────────────────────────────────────────────────────────────┐
│                    GOVERNANCE PIPELINE                       │
└─────────────────────────────────────────────────────────────┘

1. CREATED      → Proposal submitted by agent
                  ↓ (trace_id generated)
2. REVIEWED     → Policy validation & business rules
                  ↓
3. APPROVED     → Auto/manual approval decision
   REJECTED     → (STOPS HERE if rejected)
                  ↓
4. EXECUTED     → Workflow engine executes action
                  ↓
5. RECORDED     → Execution logs persisted
                  ↓
6. COMPLETED    → Outcome logged with metrics
```

---

## 🔑 Core Principles

✅ **Agents CANNOT execute** - Only create proposals  
✅ **No execution without approval** - Strict enforcement  
✅ **Full audit trail** - Every stage logged  
✅ **Immutable logs** - Execution records permanent  
✅ **trace_id propagation** - End-to-end traceability  

---

## 📊 Data Model

### Proposal Schema

```javascript
{
  proposal_id: "uuid",           // Unique proposal ID
  trace_id: "uuid",              // Global correlation ID
  agent_id: "agent-001",         // Agent identifier
  action_type: "CREATE_EMPLOYEE", // Action to perform
  payload: { ... },              // Action parameters
  status: "CREATED",             // Lifecycle status
  
  // Review Stage
  review_notes: "Passed validation",
  reviewer_type: "system",
  
  // Approval Stage
  approved_by: "admin@company.com",
  approval_timestamp: "2025-01-15T10:30:00Z",
  rejection_reason: null,
  
  // Execution Stage
  execution_id: "uuid",
  execution_status: "SUCCESS",
  execution_logs: ["..."],
  executed_at: "2025-01-15T10:31:00Z",
  
  // Outcome Stage
  outcome_summary: "Employee created successfully",
  impact_metrics: { records_created: 1 },
  errors: [],
  
  created_at: "2025-01-15T10:29:00Z",
  updated_at: "2025-01-15T10:31:00Z"
}
```

---

## 🔌 API Endpoints

**Base URL:** `http://localhost:5003/api/governance`

### 1. Create Proposal

```bash
POST /proposals/create

{
  "agent_id": "agent-crm-001",
  "action_type": "CREATE_LEAD",
  "payload": {
    "name": "John Doe",
    "contact": "john@example.com",
    "source": "website"
  }
}

Response:
{
  "success": true,
  "data": {
    "proposal_id": "abc-123",
    "trace_id": "xyz-789",
    "status": "CREATED"
  }
}
```

### 2. Review Proposal

```bash
POST /proposals/review

{
  "proposal_id": "abc-123"
}

Response:
{
  "success": true,
  "data": {
    "proposal_id": "abc-123",
    "trace_id": "xyz-789",
    "status": "REVIEWED",
    "valid": true,
    "review_notes": "Passed validation"
  }
}
```

### 3. Approve Proposal

```bash
POST /proposals/approve

{
  "proposal_id": "abc-123",
  "approved_by": "admin@company.com"
}

Response:
{
  "success": true,
  "data": {
    "proposal_id": "abc-123",
    "trace_id": "xyz-789",
    "status": "APPROVED",
    "approved_by": "admin@company.com"
  }
}
```

### 4. Reject Proposal

```bash
POST /proposals/reject

{
  "proposal_id": "abc-123",
  "rejection_reason": "Insufficient budget",
  "rejected_by": "finance@company.com"
}
```

### 5. Execute Workflow

```bash
POST /workflow/execute

{
  "proposal_id": "abc-123"
}

Response:
{
  "success": true,
  "data": {
    "proposal_id": "abc-123",
    "trace_id": "xyz-789",
    "execution_id": "exec-456",
    "status": "EXECUTED",
    "execution_status": "SUCCESS"
  }
}
```

### 6. Get Trace

```bash
GET /proposals/{proposal_id}/trace
GET /proposals/{trace_id}/trace

Response:
{
  "success": true,
  "data": {
    "proposal_id": "abc-123",
    "trace_id": "xyz-789",
    "agent_id": "agent-crm-001",
    "action_type": "CREATE_LEAD",
    "status": "COMPLETED",
    "lifecycle": {
      "created_at": "2025-01-15T10:29:00Z",
      "reviewed": true,
      "approved": true,
      "executed": true,
      "completed": true
    },
    "execution_logs": [...],
    "outcome_summary": "Lead created successfully"
  }
}
```

---

## 🎯 Supported Action Types

| Action Type | Target Service | Auto-Approval |
|------------|----------------|---------------|
| `CREATE_EMPLOYEE` | Workflow (5001) | No |
| `UPDATE_INVENTORY` | AI CRM (8000) | If qty < 100 |
| `CREATE_EXPENSE` | Artha Finance (5002) | If amount < 10000 |
| `CREATE_LEAD` | AI CRM (8000) | Yes |
| `PROCESS_ORDER` | ERP Pipeline | No |

---

## 🔍 Traceability Flow

```
Agent Request
    ↓
[trace_id: xyz-789] ← Generated at proposal creation
    ↓
Validation Service (trace_id: xyz-789)
    ↓
Approval Service (trace_id: xyz-789)
    ↓
Workflow Engine (trace_id: xyz-789)
    ↓ (HTTP Header: X-Trace-ID)
Target Service (Workflow/CRM/Finance)
    ↓
Execution Logs (trace_id: xyz-789)
    ↓
Outcome Recording (trace_id: xyz-789)
```

**Every service receives trace_id for debugging and auditing**

---

## 🚀 Quick Start

```bash
# Install dependencies
cd governance-service
npm install

# Start service
npm start

# Service runs on port 5003
```

---

## 🧪 Testing Flow

```bash
# 1. Create proposal
curl -X POST http://localhost:5003/api/governance/proposals/create \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "test-agent",
    "action_type": "CREATE_LEAD",
    "payload": {"name": "Test Lead", "contact": "test@example.com"}
  }'

# 2. Review proposal
curl -X POST http://localhost:5003/api/governance/proposals/review \
  -H "Content-Type: application/json" \
  -d '{"proposal_id": "abc-123"}'

# 3. Approve proposal
curl -X POST http://localhost:5003/api/governance/proposals/approve \
  -H "Content-Type: application/json" \
  -d '{"proposal_id": "abc-123", "approved_by": "admin"}'

# 4. Execute workflow
curl -X POST http://localhost:5003/api/governance/workflow/execute \
  -H "Content-Type: application/json" \
  -d '{"proposal_id": "abc-123"}'

# 5. Get trace
curl http://localhost:5003/api/governance/proposals/abc-123/trace
```

---

## 🔒 Security Constraints

❌ **Agents cannot:**
- Call execution APIs directly
- Bypass approval stage
- Modify execution logs
- Skip validation

✅ **System enforces:**
- Status-based transitions
- Immutable audit logs
- trace_id propagation
- Approval requirements

---

## 📈 Integration with Existing Systems

### Update Frontend (.env)

```env
VITE_GOVERNANCE_API_URL=http://localhost:5003/api/governance
```

### Agent Implementation Example

```javascript
// ❌ WRONG - Agent executing directly
await axios.post('http://localhost:5001/api/employees', data);

// ✅ CORRECT - Agent creating proposal
const proposal = await axios.post(
  'http://localhost:5003/api/governance/proposals/create',
  {
    agent_id: 'crm-agent-001',
    action_type: 'CREATE_EMPLOYEE',
    payload: data
  }
);

// Proposal goes through governance pipeline
// Agent receives trace_id for monitoring
```

---

## 📊 State Transition Diagram

```
CREATED ──review──> REVIEWED ──approve──> APPROVED ──execute──> EXECUTED ──record──> COMPLETED
                         │
                         └──reject──> REJECTED (TERMINAL)
```

**Rules:**
- REJECTED proposals cannot proceed
- Only APPROVED proposals can be EXECUTED
- Only EXECUTED proposals can be COMPLETED

---

## 🎯 Success Metrics

- ✅ Zero direct agent executions
- ✅ 100% audit trail coverage
- ✅ trace_id in all logs
- ✅ Immutable execution records
- ✅ Policy compliance enforced

---

**Version:** 1.0.0  
**Port:** 5003  
**Database:** blackhole_db (proposals collection)  
**Status:** ✅ Phase 1 Complete
