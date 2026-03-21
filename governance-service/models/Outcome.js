const mongoose = require('mongoose');

const outcomeSchema = new mongoose.Schema({
  trace_id: { type: String, required: true, unique: true, index: true },
  proposal_id: { type: String, required: true },
  action_type: { type: String, required: true },
  success_score: { type: Number, min: 0, max: 1, required: true },
  resolution_time: { type: Number, required: true },
  failure_signal: { type: Boolean, default: false },
  action_effectiveness: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
  execution_result: { type: mongoose.Schema.Types.Mixed },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AgentActionOutcome', outcomeSchema);
