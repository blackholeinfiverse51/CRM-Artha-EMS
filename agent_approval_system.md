# Agent Approval System (Human-In-The-Loop)

This document defines the Human-In-The-Loop (HITL) approval model and the production-grade HTTP endpoints that enable explicit human approval or rejection of AI-proposed actions inside the ERP backend.

## HITL Philosophy

- Humans retain full control. AI can propose actions but must never execute without explicit human authorization.
- Auditable lifecycle. Every proposal has a tamper-evident history: who proposed, who approved/rejected, timestamps, comments, and reasons.
- Safety over speed. Approval is a hard gate in the workflow. No execution occurs until an authorized human approves.
- Traceability. Requests propagate a trace_id for cross-service correlation across logs and monitoring systems.

## Why approval is mandatory

- Prevents unintended actions and systemic risks from model hallucinations or integration errors.
- Enforces internal controls and segregation-of-duties policies.
- Provides a clear audit trail for compliance and post-incident forensics.

## Endpoints

- POST /api/agent/approve-action
- POST /api/agent/reject-action

JWT middleware must already authenticate the caller and ensure the employee_id has permission to approve/reject agent actions. These endpoints only change proposal state; they DO NOT trigger any execution. Execution wiring is added separately.

## Request Body Schemas

All request bodies are JSON. Unknown fields are ignored (stripped) to reduce accidental persistence of unrecognized data.

### POST /api/agent/approve-action

Required fields:
- proposal_id: number (primary key of agent_action_proposals)
- approved_by: string (employee_id or username of the approver)

Optional fields:
- comment: string (free-form human note)
- trace_id: string (for end-to-end tracing; may also be provided via header X-Trace-Id)

Validation rules:
- proposal_id must be a positive integer.
- approved_by must be a non-empty string.
- comment if present must be a string up to 2000 chars.
- trace_id if present must be a string up to 200 chars.

### POST /api/agent/reject-action

Required fields:
- proposal_id: number (primary key of agent_action_proposals)
- rejected_by: string (employee_id or username of the reviewer)

Optional fields:
- reason: string (recommended — rationale for rejection)
- trace_id: string (for end-to-end tracing; may also be provided via header X-Trace-Id)

Validation rules:
- proposal_id must be a positive integer.
- rejected_by must be a non-empty string.
- reason if present must be a string up to 2000 chars.
- trace_id if present must be a string up to 200 chars.

## State Machine and Constraints

- Proposals begin with status = "proposed".
- Approve allowed only if status === "proposed" and not expired.
- Reject allowed only if status === "proposed" and not expired.
- If already approved/rejected/expired, the operation must be denied with HTTP 403.

## Database Table: agent_action_proposals

Relevant fields updated by these endpoints:
- status: enum ["proposed", "approved", "rejected", "expired", ...]
- approved_by: string (nullable)
- approved_at: datetime (nullable)
- rejected_by: string (nullable)
- rejected_at: datetime (nullable)
- rejection_reason: string (nullable)
- reviewer_comment: string (nullable) — stores approve comment
- updated_at: datetime
- trace_id: string (nullable) — persisted or refreshed for traceability

Additional expectations (not enforced here but recommended):
- proposal_id: bigint PK
- proposed_at: datetime (set at creation time by the proposer service)
- expires_at: datetime (used by business logic to mark a proposal as expired)

## Response Format

On success:
- HTTP 200 OK
- Body: the full, updated proposal object as stored after the operation.

Example success response body (truncated keys shown):
{
  "proposal_id": 12345,
  "status": "approved",
  "approved_by": "emp_001",
  "approved_at": "2026-03-05T10:12:55.123Z",
  "reviewer_comment": "Looks correct",
  "trace_id": "7c1e...",
  "updated_at": "2026-03-05T10:12:55.123Z",
  ... other proposal fields ...
}

## Error Cases

- 400 Bad Request — Invalid payload schema or types; include a message and validation details.
- 403 Forbidden — Proposal is not actionable (already approved, rejected, or expired).
- 404 Not Found — Proposal_id does not exist.
- 500 Internal Server Error — Unexpected error; include a generic message and correlation via trace_id.

## Security / Authorization

- Assume upstream JWT middleware authenticates the caller and injects authorization context.
- Authorization policy: caller must have explicit permission to approve/reject proposals.
- All changes must be attributed to a human principal (approved_by / rejected_by) provided in the body.
- Trace ID propagation: Accept X-Trace-Id header or trace_id field and persist it for correlation.

## Idempotency Notes

- If clients need idempotency, they should not retry blindly. These endpoints are not idempotent with respect to status transitions. Retrying after success will yield 403 (already approved/rejected). Consider future support for an Idempotency-Key header if needed.

## Auditing

- Store reviewer_comment on approval and rejection_reason on rejection.
- Always update updated_at.
- Server time (UTC) is authoritative for approved_at/rejected_at.

## Non-goals (Day 2)

- No workflow execution or side-effects beyond DB updates.
- No notifications or webhooks.
- No bulk approval.
