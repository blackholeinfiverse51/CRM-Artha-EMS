# Agent History Endpoint Documentation

## Overview

The Agent History Service provides a complete audit trail for all AI agent actions within the ERP system. It maintains persistent records of every action from proposal to execution, ensuring full traceability and accountability.

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   AI Agent      │───▶│  History Service │───▶│   MongoDB       │
│   Proposals     │    │  (Port 5003)     │    │   blackhole_db  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │  Action History  │
                       │  Collection      │
                       └──────────────────┘
```

## Database Schema

### Collection: `agentactionhistories`

```javascript
{
  trace_id: String,           // UUID - Unique action identifier
  proposal_id: String,        // AI proposal identifier
  proposal_source: String,    // Source system/agent
  action_type: String,        // Type of action (e.g., "restock_inventory")
  action_payload: Object,     // Action parameters and data
  approval_status: String,    // "pending" | "approved" | "rejected"
  approval_identity: String,  // User ID who approved/rejected
  execution_status: String,   // "not_executed" | "executed" | "failed"
  execution_result: Object,   // Execution outcome data
  timestamp_proposed: Date,   // When action was proposed
  timestamp_approved: Date,   // When action was approved/rejected
  timestamp_executed: Date,   // When action was executed
  createdAt: Date,           // Auto-generated
  updatedAt: Date            // Auto-generated
}
```

## API Endpoints

### Base URL: `http://localhost:5003/api/agent`

---

### 1. Get Action History

**Endpoint:** `GET /action-history`

**Description:** Retrieve paginated action history with optional filters

**Query Parameters:**
- `status` (string): Filter by approval status (`pending`, `approved`, `rejected`)
- `trace_id` (string): Filter by specific trace ID
- `proposal_id` (string): Filter by proposal ID
- `action_type` (string): Filter by action type
- `start_date` (string): Filter from date (ISO format)
- `end_date` (string): Filter to date (ISO format)
- `limit` (number): Records per page (default: 50, max: 100)
- `page` (number): Page number (default: 1)

**Example Requests:**
```bash
# Get all executed actions
GET /api/agent/action-history?status=executed&limit=50

# Get actions by type
GET /api/agent/action-history?action_type=restock_inventory

# Get actions in date range
GET /api/agent/action-history?start_date=2025-01-01&end_date=2025-01-31
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "history": [
      {
        "trace_id": "trace-98232",
        "proposal_id": "prop-283",
        "proposal_source": "inventory_agent",
        "action_type": "restock_inventory",
        "action_payload": {
          "product_id": "PROD-001",
          "quantity": 100,
          "supplier": "SUPP-001"
        },
        "approval_status": "approved",
        "approval_identity": "user-123",
        "execution_status": "executed",
        "execution_result": {
          "inventory_updated": true,
          "new_stock_level": 150
        },
        "timestamp_proposed": "2025-01-15T09:00:00Z",
        "timestamp_approved": "2025-01-15T09:15:00Z",
        "timestamp_executed": "2025-01-15T09:30:00Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 5,
      "total_records": 247,
      "limit": 50
    }
  }
}
```

---

### 2. Get Action by Trace ID

**Endpoint:** `GET /action-history/:trace_id`

**Description:** Retrieve complete lifecycle of a single action

**Path Parameters:**
- `trace_id` (string): Unique trace identifier

**Example Request:**
```bash
GET /api/agent/action-history/trace-98232
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "trace_id": "trace-98232",
    "proposal_id": "prop-283",
    "proposal_source": "inventory_agent",
    "action_type": "restock_inventory",
    "action_payload": {
      "product_id": "PROD-001",
      "quantity": 100,
      "supplier": "SUPP-001"
    },
    "approval_status": "approved",
    "approval_identity": "user-123",
    "execution_status": "executed",
    "execution_result": {
      "inventory_updated": true,
      "new_stock_level": 150
    },
    "timestamp_proposed": "2025-01-15T09:00:00Z",
    "timestamp_approved": "2025-01-15T09:15:00Z",
    "timestamp_executed": "2025-01-15T09:30:00Z"
  }
}
```

---

### 3. Create Action Record

**Endpoint:** `POST /action-history`

**Description:** Create new action record when AI proposes an action

**Request Body:**
```json
{
  "proposal_id": "prop-284",
  "proposal_source": "procurement_agent",
  "action_type": "create_purchase_order",
  "action_payload": {
    "supplier_id": "SUPP-002",
    "items": [
      {
        "product_id": "PROD-005",
        "quantity": 50,
        "unit_price": 25.00
      }
    ],
    "total_amount": 1250.00
  }
}
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "trace_id": "trace-98233",
    "proposal_id": "prop-284",
    "status": "created"
  }
}
```

---

### 4. Update Approval Status

**Endpoint:** `PUT /action-history/:trace_id/approval`

**Description:** Update approval status when human reviews action

**Path Parameters:**
- `trace_id` (string): Unique trace identifier

**Request Body:**
```json
{
  "approval_status": "approved",
  "approval_identity": "user-456"
}
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "trace_id": "trace-98233",
    "approval_status": "approved",
    "timestamp_approved": "2025-01-15T10:15:00Z"
  }
}
```

---

### 5. Update Execution Status

**Endpoint:** `PUT /action-history/:trace_id/execution`

**Description:** Update execution status and results

**Path Parameters:**
- `trace_id` (string): Unique trace identifier

**Request Body:**
```json
{
  "execution_status": "executed",
  "execution_result": {
    "purchase_order_created": true,
    "po_number": "PO-2025-001",
    "estimated_delivery": "2025-01-25"
  }
}
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "trace_id": "trace-98233",
    "execution_status": "executed",
    "timestamp_executed": "2025-01-15T10:30:00Z"
  }
}
```

## Error Responses

All endpoints return consistent error format:

```json
{
  "success": false,
  "error": "Error description",
  "details": "Detailed error message (development only)"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error

## Logging Requirements

The service automatically logs all lifecycle events:

```
[2025-01-15T09:00:00Z] AI_PROPOSAL_CREATED - trace_id: trace-98232, proposal_id: prop-283
[2025-01-15T09:15:00Z] HUMAN_APPROVED_ACTION - trace_id: trace-98232, status: approved, user: user-123
[2025-01-15T09:30:00Z] WORKFLOW_EXECUTION_STARTED - trace_id: trace-98232, status: executed
[2025-01-15T09:30:00Z] WORKFLOW_EXECUTION_COMPLETED - trace_id: trace-98232, status: executed
```

## Integration with Existing Systems

### Workflow EMS Integration
```javascript
// In workflow system, when creating action record
const response = await fetch('http://localhost:5003/api/agent/action-history', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    proposal_id: 'workflow-001',
    proposal_source: 'attendance_agent',
    action_type: 'auto_clock_out',
    action_payload: { employee_id: 'EMP-001', reason: 'overtime_limit' }
  })
});
```

### AI CRM Integration
```javascript
// In CRM system, when updating approval
const response = await fetch(`http://localhost:5003/api/agent/action-history/${trace_id}/approval`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    approval_status: 'approved',
    approval_identity: req.user.id
  })
});
```

## Performance Considerations

- **Indexing:** Optimized indexes on frequently queried fields
- **Pagination:** Default limit of 50 records, maximum 100
- **Rate Limiting:** 100 requests per 15 minutes per IP
- **Connection Pooling:** MongoDB connection pooling enabled

## Security Features

- **Helmet.js:** Security headers
- **CORS:** Cross-origin resource sharing
- **Rate Limiting:** Prevents abuse
- **Input Validation:** Request body validation
- **Error Handling:** Secure error responses

## Deployment

### Development
```bash
cd agent-history-service
npm install
npm run dev
```

### Production
```bash
cd agent-history-service
npm install --production
npm start
```

### Environment Variables
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/blackhole_db
PORT=5003
NODE_ENV=production
JWT_SECRET=your-secret-key
```

## Health Check

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "healthy",
  "service": "agent-history-service",
  "timestamp": "2025-01-15T10:00:00Z"
}
```