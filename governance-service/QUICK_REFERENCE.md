# 🚀 Governance Service - Quick Reference

## 📍 Service Info
- **Port:** 5003
- **Base URL:** `http://localhost:5003/api/governance`
- **Health:** `http://localhost:5003/health`

## 🔧 Quick Commands

```bash
# Start service
npm start

# Run tests
npm test

# Start with Docker
docker-compose up governance-service
```

## 🔑 Environment Variables

```env
MONGODB_URI=mongodb+srv://...
PORT=5003
JWT_SECRET=supersecretkey
AGENT_RULES_ENABLED=true
MONITOR_INTERVAL_MS=60000
```

## 📡 Key Endpoints

### Create Proposal
```bash
POST /proposals/create
Body: { agent_id, action_type, payload }
Auth: None
```

### Approve Proposal
```bash
POST /proposals/approve
Body: { proposal_id, approval_notes }
Auth: JWT (approver/admin)
```

### Get Trace
```bash
GET /proposals/:id/trace
Auth: None
```

## 🔄 State Flow

```
CREATED → REVIEWED → APPROVED → EXECUTED → COMPLETED
```

## 🤖 Creating New Agents

```javascript
const BaseAgent = require('./agents/baseAgent');

class MyAgent extends BaseAgent {
  constructor() {
    super('my-agent');
  }

  async execute() {
    await this.proposeAction('ACTION_TYPE', payload);
  }
}

// Register in agents/agentRegistry.js
```

## 🔐 JWT Token

```javascript
const jwt = require('jsonwebtoken');
const token = jwt.sign(
  { id: 'user-123', role: 'approver' },
  'supersecretkey'
);
```

## 📊 Action Types

- `AUTO_RESTOCK` - Inventory restocking
- `CREATE_LEAD` - Sales lead creation
- `CREATE_EXPENSE` - Expense record
- `CREATE_EMPLOYEE` - Employee record
- `UPDATE_INVENTORY` - Inventory update
- `SEND_ENGAGEMENT_EMAIL` - Marketing email
- `CREATE_OPPORTUNITY` - Sales opportunity

## 🧪 Test Flow

```bash
# 1. Create
curl -X POST http://localhost:5003/api/governance/proposals/create \
  -H "Content-Type: application/json" \
  -d '{"agent_id":"test","action_type":"CREATE_LEAD","payload":{}}'

# 2. Review
curl -X POST http://localhost:5003/api/governance/proposals/review \
  -d '{"proposal_id":"<id>"}'

# 3. Approve (with JWT)
curl -X POST http://localhost:5003/api/governance/proposals/approve \
  -H "Authorization: Bearer <token>" \
  -d '{"proposal_id":"<id>"}'

# 4. Get Trace
curl http://localhost:5003/api/governance/proposals/<trace_id>/trace
```

## 📁 Key Files

```
config/index.js          - Configuration
middleware/auth.js       - JWT auth
agents/baseAgent.js      - Agent interface
services/outcomeService.js - RL feedback
models/Outcome.js        - Outcome schema
```

## 🐛 Troubleshooting

**Agents not starting?**
→ Check `AGENT_RULES_ENABLED=true`

**JWT errors?**
→ Verify `JWT_SECRET` matches

**MongoDB connection?**
→ Check `MONGODB_URI`

**Approval fails?**
→ Ensure user has `approver` role

## 📚 Documentation

- Full Guide: `docs/governance-system.md`
- API Docs: `docs/API_REFERENCE.md`
- Implementation: `README_PHASES_5_10.md`

## 🎯 Key Principles

1. **No Direct Execution** - Agents propose, never execute
2. **Approval Required** - All actions need approval
3. **Full Traceability** - Every action has trace_id
4. **RL Ready** - All outcomes recorded

---

**Version:** 2.0.0 | **Status:** ✅ Production Ready
