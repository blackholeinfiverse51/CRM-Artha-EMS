# Integration Service (CRM ↔ EMS ↔ Artha)

This service provides an internal integration layer to connect CRM and EMS events into Artha APIs.

Status: Initial scaffold focusing on two flows with safe, auditable processing.

- Flow A: EMS employee.created -> Upsert employee in Artha
- Flow B: CRM invoice.created -> Post invoice to Artha ledger

Features
- Express endpoints to receive webhooks from CRM and EMS
- Input validation (Joi)
- Mappers to transform CRM/EMS payloads into Artha API payloads
- Artha API client with retries, exponential backoff, idempotency key support
- Integration event logging (JSON file-based for dev) with dead-letter storage
- Trace ID propagation via X-Trace-Id header

Environment Variables
- INTEGRATION_PORT=4300
- ARTHA_BASE_URL=https://artha.dev/api
- ARTHA_API_KEY=replace_me
- INTEGRATION_STORAGE_DIR=./backend-nodejs/services/integration/.storage
- CRM_WEBHOOK_SECRET=dev_secret (optional for HMAC signatures)
- EMS_WEBHOOK_SECRET=dev_secret (optional for HMAC signatures)

Run
- node backend-nodejs/services/integration/server.js

Endpoints (internal)
- POST /webhooks/ems/employee-created
- POST /webhooks/crm/invoice-created

Notes
- Signature verification is stubbed; enable by providing *_WEBHOOK_SECRET.
- Storage uses local JSONL files for dev. Replace with DB wiring in production.
