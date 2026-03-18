# 📋 API Contracts - Governance Service

## Base URL
```
http://localhost:5003/api/governance
```

---

## 1. Create Proposal

**Endpoint:** `POST /proposals/create`

**Description:** Agents submit action proposals (NO direct execution allowed)

### Request Schema
```json
{
  "agent_id": "string (required)",
  "action_type": "string (required) - enum: CREATE_EMPLOYEE | UPDATE_INVENTORY | CREATE_EXPENSE | CREATE_LEAD | PROCESS_ORDER",
  "payload": "object (required) - action-specific parameters"
}
```

### Response Schema
```json
{
  "success": true,
  "data": {
    "proposal_id": "uuid",
    "trace_id": "uuid",
    "status": "CREATED"
  }
}
```

### Example
```bash
curl -X POST http://localhost:5003/api/governance/proposals/create \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "crm-agent-001",
    "action_type": "CREATE_LEAD",
    "payload": {
      "name": "Acme Corp",
      "contact": "contact@acme.com",
      "source": "website",
      "value": 50000
    }
  }'
```

---

## 2. Review Proposal

**Endpoint:** `POST /proposals/review`

**Description:** Validates proposal against business rules and policies

### Request Schema
```json
{
  "proposal_id": "string (required)"
}
```

### Response Schema
```json
{
  "success": true,
  "data": {
    "proposal_id": "uuid",
    "trace_id": "uuid",
    "status": "REVIEWED",
    "valid": "boolean",
    "review_notes": "string"
  }
}
```

### Business Rules Validated

| Action Type | Validation Rules |
|------------|------------------|
| CREATE_EMPLOYEE | name && email required |
| UPDATE_INVENTORY | item_id && quantity >= 0 |
| PROCESS_ORDER | order_id && amount > 0 |
| CREATE_EXPENSE | amount > 0 && category required |
| CREATE_LEAD | name && contact required |

---

## 3. Approve Proposal

**Endpoint:** `POST /proposals/approve`

**Description:** Approves proposal for execution (manual or auto)

### Request Schema
```json
{
  "proposal_id": "string (required)",
  "approved_by": "string (optional, defaults to 'system')"
}
```

### Response Schema
```json
{
  "success": true,
  "data": {
    "proposal_id": "uuid",
    "trace_id": "uuid",
    "status": "APPROVED",
    "approved_by": "string"
  }
}
```

### Auto-Approval Rules

| Action Type | Auto-Approve Condition |
|------------|------------------------|
| CREATE_LEAD | Always |
| UPDATE_INVENTORY | quantity < 100 |
| CREATE_EXPENSE | amount < 10000 |
| CREATE_EMPLOYEE | Never (manual only) |
| PROCESS_ORDER | Never (manual only) |

---

## 4. Reject Proposal

**Endpoint:** `POST /proposals/reject`

**Description:** Rejects proposal (TERMINAL state - cannot proceed)

### Request Schema
```json
{
  "proposal_id": "string (required)",
  "rejection_reason": "string (required)",
  "rejected_by": "string (optional, defaults to 'system')"
}
```

### Response Schema
```json
{
  "success": true,
  "data": {
    "proposal_id": "uuid",
    "trace_id": "uuid",
    "status": "REJECTED",
    "rejection_reason": "string"
  }
}
```

---

## 5. Execute Workflow

**Endpoint:** `POST /workflow/execute`

**Description:** Executes APPROVED proposals via deterministic workflow engine

### Request Schema
```json
{
  "proposal_id": "string (required)"
}
```

### Response Schema (Success)
```json
{
  "success": true,
  "data": {
    "proposal_id": "uuid",
    "trace_id": "uuid",
    "execution_id": "uuid",
    "status": "EXECUTED",
    "execution_status": "SUCCESS"
  }
}
```

### Response Schema (Failure)
```json
{
  "success": false,
  "error": "Only APPROVED proposals can be executed"
}
```

### Workflow Handlers

| Action Type | Target Service | Endpoint |
|------------|----------------|----------|
| CREATE_EMPLOYEE | Workflow :5001 | POST /api/employees |
| UPDATE_INVENTORY | AI CRM :8000 | PUT /api/inventory/:id |
| CREATE_EXPENSE | Artha Finance :5002 | POST /api/expenses |
| CREATE_LEAD | AI CRM :8000 | POST /api/leads |

**Note:** All requests include `X-Trace-ID` header for traceability

---

## 6. Get Trace

**Endpoint:** `GET /proposals/:id/trace`

**Description:** Retrieves full lifecycle trace by proposal_id or trace_id

### Request
```bash
GET /proposals/{proposal_id}/trace
GET /proposals/{trace_id}/trace
```

### Response Schema
```json
{
  "success": true,
  "data": {
    "proposal_id": "uuid",
    "trace_id": "uuid",
    "agent_id": "string",
    "action_type": "string",
    "status": "COMPLETED",
    "lifecycle": {
      "created_at": "ISO8601 timestamp",
      "reviewed": "boolean",
      "approved": "boolean",
      "executed": "boolean",
      "completed": "boolean"
    },
    "execution_logs": ["array of log strings"],
    "outcome_summary": "string"
  }
}
```

### Example
```bash
curl http://localhost:5003/api/governance/proposals/abc-123-def/trace
```

---

## Error Responses

### Standard Error Format
```json
{
  "success": false,
  "error": "Error message description"
}
```

### Common Errors

| Status Code | Error | Cause |
|------------|-------|-------|
| 400 | Invalid proposal or status | Proposal not found or wrong state |
| 400 | Proposal must be reviewed first | Trying to approve CREATED proposal |
| 400 | Only APPROVED proposals can be executed | Trying to execute non-approved |
| 404 | Proposal not found | Invalid proposal_id or trace_id |

---

## Complete Workflow Example

```bash
# Step 1: Create proposal
RESPONSE=$(curl -s -X POST http://localhost:5003/api/governance/proposals/create \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "test-agent",
    "action_type": "CREATE_LEAD",
    "payload": {"name": "Test Corp", "contact": "test@corp.com"}
  }')

PROPOSAL_ID=$(echo $RESPONSE | jq -r '.data.proposal_id')
TRACE_ID=$(echo $RESPONSE | jq -r '.data.trace_id')

echo "Proposal ID: $PROPOSAL_ID"
echo "Trace ID: $TRACE_ID"

# Step 2: Review proposal
curl -X POST http://localhost:5003/api/governance/proposals/review \
  -H "Content-Type: application/json" \
  -d "{\"proposal_id\": \"$PROPOSAL_ID\"}"

# Step 3: Approve proposal
curl -X POST http://localhost:5003/api/governance/proposals/approve \
  -H "Content-Type: application/json" \
  -d "{\"proposal_id\": \"$PROPOSAL_ID\", \"approved_by\": \"admin@company.com\"}"

# Step 4: Execute workflow
curl -X POST http://localhost:5003/api/governance/workflow/execute \
  -H "Content-Type: application/json" \
  -d "{\"proposal_id\": \"$PROPOSAL_ID\"}"

# Step 5: Get full trace
curl http://localhost:5003/api/governance/proposals/$TRACE_ID/trace
```

---

## Payload Schemas by Action Type

### CREATE_EMPLOYEE
```json
{
  "name": "string (required)",
  "email": "string (required)",
  "department": "string",
  "position": "string",
  "salary": "number"
}
```

### UPDATE_INVENTORY
```json
{
  "item_id": "string (required)",
  "quantity": "number (required, >= 0)",
  "location": "string",
  "notes": "string"
}
```

### CREATE_EXPENSE
```json
{
  "amount": "number (required, > 0)",
  "category": "string (required)",
  "description": "string",
  "date": "ISO8601 date",
  "vendor": "string"
}
```

### CREATE_LEAD
```json
{
  "name": "string (required)",
  "contact": "string (required)",
  "source": "string",
  "value": "number",
  "notes": "string"
}
```

### PROCESS_ORDER
```json
{
  "order_id": "string (required)",
  "amount": "number (required, > 0)",
  "items": "array",
  "customer_id": "string"
}
```

---

## Headers

### Request Headers
```
Content-Type: application/json
```

### Response Headers (from workflow execution)
```
X-Trace-ID: {trace_id}
```

---

## Rate Limits

- No rate limits currently enforced
- Recommended: 100 requests/minute per agent_id

---

## Versioning

Current API Version: **v1**

Future versions will use path prefix: `/api/v2/governance`

---

**Last Updated:** January 2025  
**Status:** ✅ Production Ready
