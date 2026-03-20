# Quick Start Guide

## Step 1: Start Governance Service

Open Terminal 1:
```bash
cd governance-service
npm start
```

Wait for: `✅ Governance Service connected to MongoDB`

## Step 2: Test Governance Service

Open Terminal 2:
```bash
cd governance-service
node test-governance.js
```

This tests:
- ✅ Proposal creation
- ✅ Proposal review
- ✅ Proposal approval (triggers execution attempt)
- ✅ Proposal rejection
- ✅ Full trace retrieval

## Step 3: Start Workflow Service (Optional)

For full execution testing, open Terminal 3:
```bash
cd workflow-blackhole/server
npm start
```

## Step 4: Run Full Pipeline Test

Open Terminal 4:
```bash
cd governance-service
node test-pipeline.js
```

This tests:
- ✅ Complete approval → execution → traceability flow
- ✅ Workflow execution handlers
- ✅ Result recording
- ✅ Full audit trail

## Troubleshooting

### MongoDB Connection Issues
```bash
cd governance-service
node test-connection.js
```

### Service Not Starting
Check if port is already in use:
```bash
# Windows
netstat -ano | findstr :5003
netstat -ano | findstr :5001

# Kill process if needed
taskkill /PID <PID> /F
```

### Test Connection Manually
```bash
# Test governance service
curl http://localhost:5003/health

# Test workflow service
curl http://localhost:5001/api/ping
```

## Expected Output

### Governance Test (test-governance.js)
```
🧪 Testing Governance Service (Proposal Lifecycle)
✅ Governance Service is ready
1️⃣ Creating proposal...
✅ Proposal created
2️⃣ Reviewing proposal...
✅ Proposal reviewed
3️⃣ Approving proposal...
✅ Proposal approved
4️⃣ Retrieving full trace...
✅ Full trace retrieved
```

### Full Pipeline Test (test-pipeline.js)
```
🧪 Testing Approval → Execution → Traceability Pipeline
✅ Governance Service is ready
1️⃣ Creating proposal...
✅ Proposal created
2️⃣ Reviewing proposal...
✅ Proposal reviewed
3️⃣ Approving proposal (auto-triggers execution)...
✅ Proposal approved
⏳ Waiting for execution to complete...
4️⃣ Retrieving full trace...
✅ Full trace retrieved
```

## API Endpoints

### Governance Service (Port 5003)
- `GET /health` - Health check
- `POST /api/governance/proposals/create` - Create proposal
- `POST /api/governance/proposals/review` - Review proposal
- `POST /api/governance/proposals/approve` - Approve proposal
- `POST /api/governance/proposals/reject` - Reject proposal
- `GET /api/governance/proposals/:id/trace` - Get trace

### Workflow Service (Port 5001)
- `GET /api/ping` - Health check
- `POST /api/workflow/execute` - Execute approved action
