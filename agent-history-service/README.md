# Agent History Service with Traceability

## Overview

The Agent History Service provides complete end-to-end traceability and governance for all AI agent actions within the ERP system. This enhanced version includes trace ID propagation, governance rule enforcement, and cross-system integration.

## Quick Start

### Windows (Enhanced)
```bash
start-traceability-service.bat
```

### Manual Start
```bash
npm install
npm start
```

### Run Demo
```bash
node demo/traceabilityDemo.js
```

## Service Details

- **Port:** 5003
- **Database:** MongoDB Atlas (blackhole_db)
- **Health Check:** http://localhost:5003/health
- **API Base:** http://localhost:5003/api/agent

## Enhanced Features

✅ **Complete Action Lifecycle Tracking**  
✅ **Trace ID Propagation Across Systems**  
✅ **Governance Rule Enforcement**  
✅ **Cross-System Integration**  
✅ **Audit Logging with Trace Context**  
✅ **Production-Safe Security**  

## Governance Rules

1. **AI Cannot Execute Directly** - AI agents can only propose actions
2. **Approval Required** - All executions require human approval
3. **Execution Logging** - All actions must be logged
4. **Action Recovery** - All actions must be recoverable

## Key Endpoints

### Traceability
- `GET /api/agent/trace/:trace_id` - Complete trace lifecycle
- `GET /api/agent/governance/validate/:trace_id` - Governance validation
- `GET /api/traceability/info` - Service capabilities

### Action Management
- `POST /api/agent/action-history` - Create action with governance
- `PUT /api/agent/action-history/:trace_id/approval` - Approve action
- `POST /api/agent/action-history/:trace_id/execute` - Execute with governance

## Documentation

- [API Documentation](./agent_history_endpoint.md)
- [Traceability Proof](./traceability_proof.md)
- [Implementation Proof](./history_proof.md)

## Integration

This service integrates with:
- Workflow EMS (Port 5001) - Employee/Attendance actions
- AI CRM (Port 8000) - Customer/Lead actions  
- Artha Finance (Port 5002) - Financial actions

## Environment

```env
MONGODB_URI=mongodb+srv://7819vijaysharma:Ram%402025@cluster0.cvizq.mongodb.net/blackhole_db
PORT=5003
NODE_ENV=development
```

## Trace ID Flow

```
AI Proposal → Human Approval → Workflow Execution → Database Storage
     ↓              ↓                ↓                    ↓
  trace_id      trace_id         trace_id           trace_id
     ↓              ↓                ↓                    ↓
   Logs           Logs             Logs               Logs
```