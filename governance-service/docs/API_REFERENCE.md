# 🔌 Governance Service API Documentation

## Base URL
```
http://localhost:5003/api/governance
```

---

## 🔐 Authentication

Most endpoints require JWT authentication.

### Headers
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

### JWT Payload
```javascript
{
  id: "user-id",
  role: "approver" | "admin" | "user"
}
```

### Roles
- **approver**: Can approve/reject proposals
- **admin**: Full access
- **user**: Can create proposals only

---

## 📋 Endpoints

### 1. Create Proposal
**POST** `/proposals/create`

Creates a new action proposal from an agent.

**Authentication:** None (agents can create)

**Request Body:**
```json
{
  "agent_id": "monitoring-agent",
  "action_type": "AUTO_RESTOCK",
  "payload": {
    "item_id": "123",
    "item_name": "Widget",
    "current_quantity": 5,
    "reorder_quantity": 100
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "proposal_id": "uuid-1",
    "trace_id": "uuid-2",
    "status": "CREATED"
  }
}
```

**Status Codes:**
- `201` - Created
- `400` - Bad request

---

### 2. Review Proposal
**POST** `/proposals/review`

Reviews a proposal against business rules.

**Authentication:** None

**Request Body:**
```json
{
  "proposal_id": "uuid-1"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "proposal_id": "uuid-1",
    "trace_id": "uuid-2",
    "status": "REVIEWED",
    "valid": true,
    "review_notes": "Passed all validation rules"
  }
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid proposal

---

### 3. Approve Proposal
**POST** `/proposals/approve`

Approves a reviewed proposal for execution.

**Authentication:** Required (approver/admin)

**Request Body:**
```json
{
  "proposal_id": "uuid-1",
  "approval_notes": "Approved after review"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "proposal_id": "uuid-1",
    "trace_id": "uuid-2",
    "status": "APPROVED",
    "approved_by": "user-123",
    "approval_timestamp": "2025-01-15T10:30:00Z"
  }
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized (no token)
- `403` - Forbidden (wrong role)
- `400` - Invalid proposal

**Notes:**
- Triggers automatic execution via `setImmediate()`
- User ID extracted from JWT token

---

### 4. Reject Proposal
**POST** `/proposals/reject`

Rejects a reviewed proposal.

**Authentication:** Required (approver/admin)

**Request Body:**
```json
{
  "proposal_id": "uuid-1",
  "rejection_reason": "Insufficient budget",
  "rejection_notes": "Need approval from finance team"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "proposal_id": "uuid-1",
    "trace_id": "uuid-2",
    "status": "REJECTED",
    "rejection_reason": "Insufficient budget"
  }
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized
- `403` - Forbidden
- `400` - Invalid proposal

---

### 5. Execute Workflow
**POST** `/workflow/execute`

Manually triggers execution of an approved proposal.

**Authentication:** None (internal use)

**Request Body:**
```json
{
  "proposal_id": "uuid-1"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "proposal_id": "uuid-1",
    "trace_id": "uuid-2",
    "execution_id": "uuid-3",
    "status": "EXECUTED",
    "execution_status": "SUCCESS"
  }
}
```

**Status Codes:**
- `200` - Success
- `400` - Proposal not approved or execution failed

**Notes:**
- Usually triggered automatically after approval
- Records outcome for RL feedback

---

### 6. Get Trace
**GET** `/proposals/:id/trace`

Retrieves full lifecycle trace of a proposal.

**Authentication:** None

**Parameters:**
- `id` - proposal_id or trace_id

**Response:**
```json
{
  "success": true,
  "data": {
    "proposal_id": "uuid-1",
    "trace_id": "uuid-2",
    "agent_id": "monitoring-agent",
    "action_type": "AUTO_RESTOCK",
    "status": "COMPLETED",
    "lifecycle": {
      "created_at": "2025-01-15T10:25:00Z",
      "reviewed": true,
      "approved": true,
      "executed": true,
      "completed": true
    },
    "execution_logs": [
      "[2025-01-15T10:30:00Z] Starting execution for AUTO_RESTOCK",
      "[2025-01-15T10:30:02Z] Execution successful"
    ],
    "outcome_summary": {
      "success_score": 0.95,
      "resolution_time": 2340,
      "action_effectiveness": "high"
    }
  }
}
```

**Status Codes:**
- `200` - Success
- `404` - Proposal not found

---

### 7. Health Check
**GET** `/health`

Service health check.

**Authentication:** None

**Response:**
```json
{
  "status": "healthy",
  "service": "governance"
}
```

**Status Codes:**
- `200` - Service is healthy

---

## 🔄 State Transitions

```
CREATED → REVIEWED → APPROVED → EXECUTED → COMPLETED
                   ↓
                REJECTED
```

### State Descriptions

| State | Description | Next States |
|-------|-------------|-------------|
| CREATED | Proposal created by agent | REVIEWED |
| REVIEWED | Validated against business rules | APPROVED, REJECTED |
| APPROVED | Approved for execution | EXECUTED |
| REJECTED | Rejected by approver | (terminal) |
| EXECUTED | Workflow executed | COMPLETED |
| COMPLETED | Outcome recorded | (terminal) |

---

## 🎯 Action Types

### Supported Actions

| Action Type | Description | Auto-Approve |
|-------------|-------------|--------------|
| AUTO_RESTOCK | Restock inventory | Conditional |
| CREATE_LEAD | Create sales lead | Yes |
| CREATE_EXPENSE | Create expense record | Conditional |
| CREATE_EMPLOYEE | Create employee | No |
| UPDATE_INVENTORY | Update inventory | Conditional |
| SEND_ENGAGEMENT_EMAIL | Marketing email | Yes |
| CREATE_OPPORTUNITY | Create sales opportunity | No |

### Auto-Approval Rules

```javascript
{
  'CREATE_LEAD': true,
  'UPDATE_INVENTORY': (payload) => payload.quantity < 100,
  'CREATE_EXPENSE': (payload) => payload.amount < 10000
}
```

---

## 📊 RL Feedback Data

### Outcome Metrics

After execution, the system records:

```javascript
{
  trace_id: "uuid",
  proposal_id: "uuid",
  action_type: "AUTO_RESTOCK",
  success_score: 0.95,        // 0-1 scale
  resolution_time: 2340,      // milliseconds
  failure_signal: false,      // boolean
  action_effectiveness: "high" // high/medium/low
}
```

### Success Score Calculation

- `1.0` - Successful execution
- `0.5` - Partial success
- `0.2` - Execution with errors
- `0.0` - Complete failure

### Effectiveness Rating

- **high**: score ≥ 0.8 AND time < 5000ms
- **medium**: score ≥ 0.5 AND time < 10000ms
- **low**: Otherwise

---

## 🔍 Error Responses

### Standard Error Format
```json
{
  "success": false,
  "error": "Error message"
}
```

### Common Errors

| Status | Error | Cause |
|--------|-------|-------|
| 400 | Bad Request | Invalid payload |
| 401 | No token provided | Missing Authorization header |
| 403 | Invalid token | JWT verification failed |
| 403 | Insufficient permissions | Wrong role |
| 404 | Proposal not found | Invalid proposal_id |

---

## 🧪 Testing Examples

### cURL Examples

#### Create Proposal
```bash
curl -X POST http://localhost:5003/api/governance/proposals/create \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "monitoring-agent",
    "action_type": "AUTO_RESTOCK",
    "payload": {
      "item_id": "123",
      "item_name": "Widget",
      "current_quantity": 5,
      "reorder_quantity": 100
    }
  }'
```

#### Approve with JWT
```bash
curl -X POST http://localhost:5003/api/governance/proposals/approve \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "proposal_id": "uuid-1",
    "approval_notes": "Approved"
  }'
```

#### Get Trace
```bash
curl http://localhost:5003/api/governance/proposals/uuid-2/trace
```

### JavaScript Examples

```javascript
const axios = require('axios');

// Create proposal
const response = await axios.post(
  'http://localhost:5003/api/governance/proposals/create',
  {
    agent_id: 'monitoring-agent',
    action_type: 'AUTO_RESTOCK',
    payload: { item_id: '123', reorder_quantity: 100 }
  }
);

// Approve with JWT
const approveResponse = await axios.post(
  'http://localhost:5003/api/governance/proposals/approve',
  { proposal_id: response.data.data.proposal_id },
  { headers: { Authorization: `Bearer ${token}` } }
);
```

---

## 🔧 Configuration

### Environment Variables

```env
# Service
PORT=5003
JWT_SECRET=supersecretkey

# Agents
AGENT_RULES_ENABLED=true
MONITOR_INTERVAL_MS=60000
AUTO_APPROVE_THRESHOLD=0.95

# External APIs
WORKFLOW_API_URL=http://localhost:5001/api
CRM_API_URL=http://localhost:8000
FINANCE_API_URL=http://localhost:5002/api
```

---

## 📚 Related Documentation

- [Governance System Guide](./governance-system.md)
- [Implementation Summary](../IMPLEMENTATION_SUMMARY.md)
- [State Transitions](../STATE_TRANSITIONS.md)
- [Architecture Overview](../GOVERNANCE_ARCHITECTURE.md)

---

**Version:** 2.0.0  
**Last Updated:** January 2025  
**Status:** ✅ Production Ready
