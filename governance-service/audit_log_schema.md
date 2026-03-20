# Audit Log Schema

## Overview
Immutable, append-only audit trail for all governance actions.

## Schema Structure

```javascript
{
  trace_id: String (indexed, required),
  proposal_id: String (indexed, required),
  event_type: String (enum),
  timestamp: Date (default: now),
  actor: String,
  action: String,
  payload: Mixed,
  service: String,
  status: String
}
```

## Event Types

### Proposal Lifecycle
- `PROPOSAL_CREATED`
- `PROPOSAL_REVIEWED`
- `PROPOSAL_APPROVED`
- `PROPOSAL_REJECTED`

### Execution Lifecycle
- `EXECUTION_TRIGGERED`
- `EXECUTION_STARTED`
- `EXECUTION_COMPLETED`
- `EXECUTION_FAILED`

### Action History
- `APPROVAL_UPDATED`
- `EXECUTION_RECORDED`

## Audit Rules

1. **Immutability**: No updates or deletes allowed
2. **Append-Only**: Only inserts permitted
3. **Timestamped**: Every entry has ISO8601 timestamp
4. **Traceable**: All entries linked via trace_id
5. **Complete**: Full event timeline maintained

## Query Patterns

### Get Full Trace
```javascript
AuditLog.find({ trace_id }).sort({ timestamp: 1 })
```

### Get Proposal History
```javascript
AuditLog.find({ proposal_id }).sort({ timestamp: 1 })
```

### Get Service Events
```javascript
AuditLog.find({ service: 'workflow_service' }).sort({ timestamp: -1 })
```

## Log Format

```json
{
  "trace_id": "uuid-v4",
  "proposal_id": "uuid-v4",
  "event_type": "EXECUTION_COMPLETED",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "actor": "system",
  "action": "salary_update",
  "payload": { "employee_id": "123", "new_salary": 50000 },
  "service": "workflow_service",
  "status": "success"
}
```

## Retention Policy

- Logs retained indefinitely
- No automatic deletion
- Archive after 1 year (optional)
- Compliance: SOC2, GDPR ready
