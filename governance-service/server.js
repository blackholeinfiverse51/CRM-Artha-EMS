const config = require('./config');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const governanceRoutes = require('./routes/governanceRoutes');
const traceLogger = require('./middleware/traceLogger');
const agentRegistry = require('./agents/agentRegistry');

const app = express();

app.use(cors());
app.use(express.json());
app.use(traceLogger);

mongoose.connect(config.MONGODB_URI, {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
}).then(() => {
  console.log('✅ Governance Service connected to MongoDB');
  if (config.AGENT_RULES_ENABLED) {
    agentRegistry.startAll();
  }
}).catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

app.use('/api/governance', governanceRoutes);
app.use('/api/agent', governanceRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'governance' });
});

const PORT = config.PORT;
app.listen(PORT, () => {
  console.log(`🚀 Governance Service running on port ${PORT}`);
});

process.on('SIGTERM', () => {
  agentRegistry.stopAll();
  process.exit(0);
});
