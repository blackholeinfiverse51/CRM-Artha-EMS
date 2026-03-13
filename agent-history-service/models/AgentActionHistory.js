const mongoose = require('mongoose');

const agentActionHistorySchema = new mongoose.Schema({
  trace_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  proposal_id: {
    type: String,
    required: true,
    index: true
  },
  proposal_source: {
    type: String,
    required: true
  },
  action_type: {
    type: String,
    required: true,
    index: true
  },
  action_payload: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  approval_status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },
  approval_identity: {
    type: String,
    default: null
  },
  execution_status: {
    type: String,
    enum: ['not_executed', 'executed', 'failed'],
    default: 'not_executed',
    index: true
  },
  execution_result: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  timestamp_proposed: {
    type: Date,
    default: Date.now,
    index: true
  },
  timestamp_approved: {
    type: Date,
    default: null
  },
  timestamp_executed: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Compound indexes for efficient querying
agentActionHistorySchema.index({ approval_status: 1, timestamp_proposed: -1 });
agentActionHistorySchema.index({ execution_status: 1, timestamp_executed: -1 });
agentActionHistorySchema.index({ action_type: 1, timestamp_proposed: -1 });

module.exports = mongoose.model('AgentActionHistory', agentActionHistorySchema);