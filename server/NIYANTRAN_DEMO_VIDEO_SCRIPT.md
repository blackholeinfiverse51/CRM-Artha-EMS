# Niyantran Demo Video Script (Phases 2-10)

## Goal
Show: Candidate lifecycle from NDA to task submission with state machine, governance, traceability, and SETU feed.

## Recording Checklist
1. Start Workflow server and agent-history-service.
2. Open Postman collection: `postman/niyantran-phases-2-10.postman_collection.json`.
3. Run NDA upload, sign, submit requests.
4. Run task assign and task submit requests.
5. Re-run task submit with same idempotency key to show replay response.
6. Call SETU dashboard feed endpoint.
7. Show trace artifacts:
   - API response `X-Trace-ID` header
   - Agent history entry in agent-history-service
   - Bucket log path `history/candidate-{candidateId}/{trace_id}.json`

## Suggested Narration
1. "Candidate is in deterministic state flow; invalid transitions are blocked by state machine."
2. "NDA lifecycle is auditable and immutable after submission."
3. "Task assignment enforces one active task per candidate."
4. "Submission endpoint is idempotent and replay-safe."
5. "SETU feed reflects latest actions and pending work in real time."

## Expected End State
- Candidate status: `SUBMITTED`
- NDA status: `submitted`
- Active task: none
- Latest feed includes `submit_task`
- Trace logs available in history service and bucket
