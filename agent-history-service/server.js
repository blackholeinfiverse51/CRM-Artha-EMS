const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');

const agentHistoryRoutes = require('./routes/agentHistory');
const enhancedAgentHistoryRoutes = require('./routes/enhancedAgentHistory');
const productionRoutes = require('./routes/productionRoutes');

const app = express();
const PORT = process.env.PORT || 5003;

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://7819vijaysharma:Ram%402025@cluster0.cvizq.mongodb.net/blackhole_db';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connected to MongoDB Atlas - blackhole_db');
})
.catch((error) => {
  console.error('MongoDB connection error:', error);
  process.exit(1);
});

// Routes
app.use('/api/agent', agentHistoryRoutes);
app.use('/api/agent', enhancedAgentHistoryRoutes);
app.use('/api/agent', productionRoutes);

// Traceability info endpoint
app.get('/api/traceability/info', (req, res) => {
  res.json({
    service: 'agent-history-service',
    traceability_features: {
      trace_id_propagation: true,
      governance_enforcement: true,
      end_to_end_tracking: true,
      audit_logging: true
    },
    governance_rules: {
      ai_direct_execution: 'forbidden',
      approval_required: 'enforced',
      execution_logging: 'mandatory',
      action_recovery: 'enabled'
    },
    endpoints: {
      trace_lifecycle: '/api/agent/trace/:trace_id',
      governance_validation: '/api/agent/governance/validate/:trace_id',
      action_history: '/api/agent/action-history',
      create_action: 'POST /api/agent/action-history',
      approve_action: 'PUT /api/agent/action-history/:trace_id/approval',
      execute_action: 'POST /api/agent/action-history/:trace_id/execute'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'agent-history-service',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

app.listen(PORT, () => {
  console.log(`Agent History Service running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Action History API: http://localhost:${PORT}/api/agent/action-history`);
  console.log(`Trace Lifecycle API: http://localhost:${PORT}/api/agent/trace/:trace_id`);
  console.log(`Traceability Info: http://localhost:${PORT}/api/traceability/info`);
  console.log(`Governance enabled with trace ID propagation`);
});