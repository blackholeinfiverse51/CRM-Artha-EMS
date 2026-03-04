# Agent Action Proposal Contract (Day 1)

## Philosophy

- Safety first: no automated execution. Every proposed action must be explicitly approved by a human before any workflow is triggered.
- Human-in-the-loop: proposals are submitted by services/agents, but a human reviewer approves/rejects in a separate flow.
- Traceability: all proposals are immutable records with full context, provenance, and a shared trace_id that links telemetry across services.
- Separation of concerns: proposal submission only records intent. Execution is performed by a separate, isolated system after approval.

## Endpoint

- Method: POST
- Path: /api/agent/propose-action
- Purpose: Persist a proposed action for human review and subsequent processing.
- Side effects: Only database insert; no workflow execution and no external calls.

## Request Schema (JSON)

Required fields:
- trace_id: string (UUID v4 or v1). Correlates requests across systems.
- employee_id: string or number. Identifier of the employee context for the action.
- action_type: string. Kebab-case or snake_case only (e.g., "approve_leave", "escalate-task").
- action_payload: object. Arbitrary, valid JSON object with action parameters.
- proposed_by: string. Origin of the proposal (e.g., "ai-assistant-v1", "monitoring-service").

Optional fields:
- reason: string (1..2000 chars). Short rationale for the proposal.
- metadata: object. Additional non-critical context (e.g., model_version, confidence, source_event_id).
- requested_at: string (ISO 8601 datetime). If omitted, server will use current time.

Example request body:
{
  "trace_id": "7c1bbf5e-5a6e-4b8e-8a9c-4d9d9a6c1b2a",
  "employee_id": "E-1029",
  "action_type": "approve_leave",
  "action_payload": {
    "request_id": "LR-8842",
    "days": 3,
    "start_date": "2026-03-10",
    "policy_check": { "meets_balance": true, "conflicts": [] }
  },
  "proposed_by": "ai-assistant-v1",
  "reason": "Leave balance sufficient; no conflicts detected",
  "metadata": { "model_version": "v1.3.2", "confidence": 0.91 }
}

## Validation Rules

- trace_id: required; must be a valid UUID (v1 or v4). Case-insensitive, hyphenated format.
- employee_id: required; string (1..128) or number (safe integer). If string, trim and disallow empty.
- action_type: required; string (1..128); regex: ^[a-z0-9]+(?:[-_][a-z0-9]+)*$ (kebab or snake). No spaces or uppercase.
- action_payload: required; JSON object; not null; max serialized size recommended <= 64 KiB.
- proposed_by: required; string (1..128); regex: ^[a-z0-9]+(?:[-_][a-z0-9.]+)*$ (lowercase, digits, dash, underscore, dot allowed after first segment).
- reason: optional; string; max 2000 chars.
- metadata: optional; JSON object.
- requested_at: optional; ISO 8601 timestamp; must be <= now (no future timestamps) if provided.
- Headers: X-Trace-Id may also carry a trace ID; if both header and body provided, they must match. If only header is present, server may use it to populate trace_id when absent (but in Day 1 we require body.trace_id explicitly).

## Persistence Model

Suggested table/collection: agent_action_proposals

Columns/fields:
- id: primary key (server-generated UUID).
- trace_id: string (UUID indexed).
- employee_id: string.
- action_type: string (indexed for review queues).
- action_payload: JSON / TEXT depending on DB; stored as provided.
- proposed_by: string (indexed for provenance).
- reason: string (nullable).
- metadata: JSON (nullable).
- status: enum { proposed, approved, rejected, executed, failed } (default: proposed).
- requested_at: timestamp (from request or now()).
- created_at: timestamp (server clock, default now()).
- updated_at: timestamp (server clock, default now(), auto-updated on status changes).

Indexing:
- (status, created_at DESC) for review queues.
- (trace_id) for traceability.
- (employee_id, status) for employee-centric review.

## Status Lifecycle

- proposed: initial state upon insertion by this endpoint.
- approved: set by human review workflow.
- rejected: set by human review workflow.
- executed: set by execution service after running the action.
- failed: set by execution service if execution errors.

This endpoint only creates records in proposed state. State transitions occur in separate, authenticated flows.

## Response Semantics

- 201 Created on success with body:
  {
    "trace_id": "...",
    "proposal_id": "...",  // server-generated id
    "status": "proposed"
  }
- 400 Bad Request on validation failure with details.
- 409 Conflict if a duplicate natural key is prevented (e.g., same trace_id and dedup hash). Day 1 does not enforce dedup server-side by default; can be added later.
- 500 Internal Server Error on unexpected failures.

## Why We Never Call the Workflow Executor from This Endpoint

- Principle of least privilege: submission service should not have permission to execute actions.
- Audit integrity: decoupling ensures proposals are immutable and reviewed before any state change in external systems.
- Safety: prevents privilege escalation and accidental execution from malformed or adversarial inputs.
- Reliability: isolates reviewer UX and executor backpressure from submission path, keeping proposal intake highly available.
- Compliance: supports explicit human approval logs and SOX/ISO-style control separation.

This endpoint is write-only to the proposals table and must not enqueue, invoke, or trigger any executor, workers, or webhooks.
