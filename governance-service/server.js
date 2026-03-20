require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const governanceRoutes = require('./routes/governanceRoutes');
const traceLogger = require('./middleware/traceLogger');

const app = express();

app.use(cors());
app.use(express.json());
app.use(traceLogger);

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ Governance Service connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

app.use('/api/governance', governanceRoutes);
app.use('/api/agent', governanceRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'governance' });
});

const PORT = process.env.PORT || 5003;
app.listen(PORT, () => {
  console.log(`🚀 Governance Service running on port ${PORT}`);
});
