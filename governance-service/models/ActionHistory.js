const mongoose = require('mongoose');

const actionHistorySchema = new mongoose.Schema({
  trace_id: { type: String, required: true, unique: true, index: true },
  proposal_id: { type: String, required: true, index: true },
  agent_id: { type: String, required: true },
  action_type: { type: String, required: true },
  action_payload: { type: mongoose.Schema.Types.Mixed, required: true },
  approval_status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  approved_by: String,
  approval_timestamp: Date,
  execution_status: { type: String, enum: ['pending', 'executing', 'completed', 'failed'] },
  execution_timestamp: Date,
  result_payload: mongoose.Schema.Types.Mixed,
  failure_reason: String,
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ActionHistory', actionHistorySchema, 'action_history');
