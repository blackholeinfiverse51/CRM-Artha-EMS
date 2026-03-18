const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const proposalSchema = new mongoose.Schema({
  proposal_id: { type: String, default: uuidv4, unique: true, index: true },
  trace_id: { type: String, default: uuidv4, unique: true, index: true },
  agent_id: { type: String, required: true },
  action_type: { type: String, required: true },
  payload: { type: mongoose.Schema.Types.Mixed, required: true },
  status: { 
    type: String, 
    enum: ['CREATED', 'REVIEWED', 'APPROVED', 'REJECTED', 'EXECUTED', 'COMPLETED'],
    default: 'CREATED',
    index: true
  },
  review_notes: String,
  reviewer_type: { type: String, enum: ['system', 'manual'] },
  approved_by: String,
  approval_timestamp: Date,
  rejection_reason: String,
  execution_id: String,
  execution_status: { type: String, enum: ['SUCCESS', 'FAILURE'] },
  execution_logs: [String],
  executed_at: Date,
  outcome_summary: String,
  impact_metrics: mongoose.Schema.Types.Mixed,
  errors: [String],
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, { timestamps: true });

proposalSchema.index({ trace_id: 1, status: 1 });

module.exports = mongoose.model('Proposal', proposalSchema, 'proposals');
