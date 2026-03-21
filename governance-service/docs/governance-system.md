# 🛡️ Agentic ERP Governance System

## Overview

Enterprise-grade governance layer ensuring **no AI agent executes actions directly**. All actions require approval through a deterministic, traceable lifecycle.

---

## 🔄 Governance Lifecycle

```
[Monitoring Agent] → Detects anomaly
        ↓
[Proposal Service] → Creates proposal (CREATED)
        ↓
[Validation Service] → Reviews business rules (REVIEWED)
        ↓
[Approval Service] → Human/Auto approval (APPROVED)
        ↓
[Workflow Engine] → Executes action (EXECUTED)
        ↓
[Outcome Store] → Records results (COMPLETED)
        ↓
[RL Feedback Loop] → Learning dataset
```

**States:** CREATED → REVIEWED → APPROVED → EXECUTED → COMPLETED

---

## 🔍 Trace Flow

Every request carries a `trace_id` (UUID) that flows through:

1. **Agent Detection** - Monitoring agent generates trace_id
2. **Proposal Creation** - Stored with trace_id
3. **Validation** - Logged with trace_id
4. **Approval** - Recorded with trace_id
5. **Execution** - Workflow maintains trace_id
6. **Outcome** - Results linked to trace_id

**Query trace:**
```bash
GET /api/governance/proposals/{trace_id}/trace
```

---

## 🏗️ Service Responsibilities

### Monitoring Agent
- **Purpose:** Detect anomalies (low inventory, idle leads, etc.)
- **Action:** Creates proposals only
- **Never:** Executes directly
- **Interval:** Configurable via `MONITOR_INTERVAL_MS`

### Proposal Service
- **Purpose:** Store action proposals
- **Schema:** agent_id, action_type, payload, trace_id
- **Status:** Starts as CREATED
- **Storage:** MongoDB `proposals` collection

### Approval Service
- **Purpose:** Validate and approve/reject proposals
- **Rules:** Auto-approval for low-risk actions
- **Auth:** JWT + role-based (approver/admin)
- **Fields:** approved_by_user_id, approval_timestamp, approval_notes

### Workflow Service
- **Purpose:** Execute approved proposals
- **Handlers:** Action-specific execution logic
- **Integration:** Calls Workflow/CRM/Finance APIs
- **Logging:** Full execution trace

### Outcome Service
- **Purpose:** Record execution results for RL
- **Metrics:** success_score, resolution_time, failure_signal
- **Storage:** MongoDB `agent_action_outcomes` collection

---

## ⚖️ Execution Rules

### Rule 1: No Direct Execution
Agents **cannot** execute actions directly. They must:
1. Create a proposal
2. Wait for approval
3. Let workflow service execute

### Rule 2: Approval Required
All proposals require approval:
- **Auto-approval:** Low-risk actions (configurable)
- **Manual approval:** High-risk actions (JWT protected)

### Rule 3: Full Traceability
Every action must:
- Generate unique trace_id
- Log all state transitions
- Store execution results

### Rule 4: Deterministic Execution
Workflow handlers must:
- Be idempotent
- Handle failures gracefully
- Return structured results

---

## 🤖 RL Feedback Loop

### Data Collection
After each execution, the system records:
- `success_score` (0-1): Calculated from result
- `resolution_time` (ms): Execution duration
- `failure_signal` (boolean): Error occurred?
- `action_effectiveness` (high/medium/low): Performance rating

### Storage
```javascript
{
  trace_id: "uuid",
  proposal_id: "uuid",
  action_type: "AUTO_RESTOCK",
  success_score: 0.95,
  resolution_time: 2340,
  failure_signal: false,
  action_effectiveness: "high"
}
```

### Future Use
- Train RL models on outcome data
- Optimize auto-approval thresholds
- Improve agent decision-making

---

## 🔐 Authentication

### JWT Protection
Approval endpoints require JWT:
```bash
Authorization: Bearer <token>
```

### Role-Based Access
- **approver:** Can approve/reject proposals
- **admin:** Full access
- **agent:** Can create proposals only

### Middleware
- `auth.js` - Validates JWT
- `roleCheck.js` - Validates user role

---

## 🧩 Agent Expansion

### Base Agent Interface
```javascript
class BaseAgent {
  constructor(name) { this.name = name; }
  async proposeAction(action_type, payload) { /* ... */ }
  async execute() { throw new Error("Not implemented"); }
}
```

### Creating New Agents
1. Extend `BaseAgent`
2. Implement `execute()` method
3. Use `proposeAction()` to create proposals
4. Register in `agentRegistry.js`

### Example Agents
- **MonitoringAgent** - Inventory monitoring
- **MarketingAgent** - Customer engagement
- **SalesAgent** - Opportunity creation

---

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                  AI CRM Frontend                     │
│                   (Port 3000)                        │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│              Governance Service (5003)               │
│  ┌──────────┬──────────┬──────────┬──────────┐     │
│  │ Agents   │ Proposal │ Approval │ Workflow │     │
│  │ Registry │ Service  │ Service  │ Service  │     │
│  └──────────┴──────────┴──────────┴──────────┘     │
└────────────────────┬────────────────────────────────┘
                     │
         ┌───────────┼───────────┐
         ▼           ▼           ▼
    ┌────────┐  ┌────────┐  ┌────────┐
    │Workflow│  │AI CRM  │  │ Artha  │
    │ :5001  │  │ :8000  │  │ :5002  │
    └────────┘  └────────┘  └────────┘
         │           │           │
         └───────────┴───────────┘
                     │
                     ▼
            ┌────────────────┐
            │  MongoDB Atlas  │
            │  blackhole_db   │
            │  + proposals    │
            │  + outcomes     │
            └────────────────┘
```

---

## 🚀 Quick Start

### Installation
```bash
cd governance-service
npm install
```

### Configuration
Edit `.env`:
```env
MONGODB_URI=mongodb+srv://...
PORT=5003
JWT_SECRET=supersecretkey
MONITOR_INTERVAL_MS=60000
IDLE_THRESHOLD_HOURS=2
AGENT_RULES_ENABLED=true
```

### Start Service
```bash
npm start
```

### Test Flow
```bash
# 1. Create proposal
curl -X POST http://localhost:5003/api/governance/proposals/create \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "test-agent",
    "action_type": "CREATE_LEAD",
    "payload": {"name": "Test Lead"}
  }'

# 2. Review proposal
curl -X POST http://localhost:5003/api/governance/proposals/review \
  -H "Content-Type: application/json" \
  -d '{"proposal_id": "<from_step_1>"}'

# 3. Approve proposal (requires JWT)
curl -X POST http://localhost:5003/api/governance/proposals/approve \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "proposal_id": "<from_step_1>",
    "approval_notes": "Approved for testing"
  }'

# 4. Get trace
curl http://localhost:5003/api/governance/proposals/<trace_id>/trace
```

---

## 📋 API Reference

### Create Proposal
```
POST /api/governance/proposals/create
Body: { agent_id, action_type, payload }
Response: { proposal_id, trace_id, status }
```

### Review Proposal
```
POST /api/governance/proposals/review
Body: { proposal_id }
Response: { status: "REVIEWED", valid: true/false }
```

### Approve Proposal
```
POST /api/governance/proposals/approve
Headers: Authorization: Bearer <token>
Body: { proposal_id, approval_notes }
Response: { status: "APPROVED", approved_by, approval_timestamp }
```

### Reject Proposal
```
POST /api/governance/proposals/reject
Headers: Authorization: Bearer <token>
Body: { proposal_id, rejection_reason, rejection_notes }
Response: { status: "REJECTED" }
```

### Execute Workflow
```
POST /api/governance/workflow/execute
Body: { proposal_id }
Response: { execution_id, status: "EXECUTED" }
```

### Get Trace
```
GET /api/governance/proposals/:id/trace
Response: { trace_id, lifecycle, execution_logs, outcome_summary }
```

---

## 🔧 Configuration Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGODB_URI` | - | MongoDB connection string |
| `PORT` | 5003 | Service port |
| `JWT_SECRET` | - | JWT signing secret |
| `MONITOR_INTERVAL_MS` | 60000 | Agent check interval |
| `IDLE_THRESHOLD_HOURS` | 2 | Idle detection threshold |
| `API_BASE_URL` | http://localhost:5003 | Governance API URL |
| `AGENT_RULES_ENABLED` | true | Enable/disable agents |
| `AUTO_APPROVE_THRESHOLD` | 0.95 | Auto-approval confidence |
| `WORKFLOW_API_URL` | http://localhost:5001/api | Workflow service |
| `CRM_API_URL` | http://localhost:8000 | CRM service |
| `FINANCE_API_URL` | http://localhost:5002/api | Finance service |

---

## 🐳 Docker Support

### Dockerfile
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 5003
CMD ["npm", "start"]
```

### docker-compose.yml
```yaml
governance-service:
  build: ./governance-service
  ports:
    - "5003:5003"
  environment:
    - MONGODB_URI=${MONGODB_URI}
    - JWT_SECRET=${JWT_SECRET}
    - AGENT_RULES_ENABLED=true
```

---

## ✅ Validation Checklist

- [x] No hardcoded config
- [x] JWT auth working
- [x] Approval required before execution
- [x] trace_id present everywhere
- [x] Monitoring → Proposal → Execution flow works
- [x] Outcomes stored
- [x] Agents modular
- [x] Docker ready

---

## 📚 Additional Resources

- [API Contracts](../API_CONTRACTS.md)
- [State Transitions](../STATE_TRANSITIONS.md)
- [Governance Architecture](../GOVERNANCE_ARCHITECTURE.md)

---

**Version:** 2.0.0  
**Last Updated:** January 2025  
**Status:** ✅ Production Ready
