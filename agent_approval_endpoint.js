// agent_approval_endpoint.js
// Human-in-the-loop approval endpoints for agent action proposals
// Day 2: Approval/Rejection only (no execution)

const express = require('express');
const Joi = require('joi');

// Assume db helper exists and is configured (e.g., Knex): db('agent_action_proposals')
// The module that imports this file must provide `db` via dependency injection or global.
// For simplicity here, we expect `req.app.get('db')` to return the db instance.

const router = express.Router();

// Schemas
const approveSchema = Joi.object({
  proposal_id: Joi.number().integer().positive().required(),
  approved_by: Joi.string().trim().min(1).required(),
  comment: Joi.string().max(2000).optional(),
  trace_id: Joi.string().max(200).optional(),
}).unknown(false);

const rejectSchema = Joi.object({
  proposal_id: Joi.number().integer().positive().required(),
  rejected_by: Joi.string().trim().min(1).required(),
  reason: Joi.string().max(2000).optional(),
  trace_id: Joi.string().max(200).optional(),
}).unknown(false);

function getTraceId(req, payloadTraceId) {
  const headerTrace = req.headers['x-trace-id'];
  return headerTrace || payloadTraceId || null;
}

async function findProposal(db, proposal_id) {
  return db('agent_action_proposals').where({ proposal_id }).first();
}

function isActionable(proposal) {
  if (!proposal) return false;
  if (proposal.status !== 'proposed') return false;
  if (proposal.expires_at && new Date(proposal.expires_at) < new Date()) return false; // treat expired as not actionable
  return true;
}

// POST /api/agent/approve-action
router.post('/approve-action', async (req, res) => {
  const db = req.app.get('db');
  if (!db) return res.status(500).json({ error: 'DB_NOT_AVAILABLE' });

  const { value, error } = approveSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ error: 'INVALID_PAYLOAD', details: error.details.map(d => d.message) });
  }

  const trace_id = getTraceId(req, value.trace_id);

  try {
    const existing = await findProposal(db, value.proposal_id);
    if (!existing) {
      return res.status(404).json({ error: 'PROPOSAL_NOT_FOUND', proposal_id: value.proposal_id, trace_id });
    }

    if (!isActionable(existing)) {
      let reason = 'PROPOSAL_NOT_ACTIONABLE';
      if (existing.status !== 'proposed') reason = 'ALREADY_' + String(existing.status || '').toUpperCase();
      else if (existing.expires_at && new Date(existing.expires_at) < new Date()) reason = 'EXPIRED';
      return res.status(403).json({ error: reason, proposal_id: value.proposal_id, trace_id });
    }

    const now = new Date().toISOString();

    await db('agent_action_proposals')
      .where({ proposal_id: value.proposal_id })
      .update({
        status: 'approved',
        approved_by: value.approved_by,
        approved_at: now,
        reviewer_comment: value.comment || null,
        trace_id: trace_id || existing.trace_id || null,
        updated_at: now,
      });

    const updated = await findProposal(db, value.proposal_id);

    return res.status(200).json(updated);
  } catch (err) {
    // Do not leak internals
    return res.status(500).json({ error: 'INTERNAL_ERROR', trace_id });
  }
});

// POST /api/agent/reject-action
router.post('/reject-action', async (req, res) => {
  const db = req.app.get('db');
  if (!db) return res.status(500).json({ error: 'DB_NOT_AVAILABLE' });

  const { value, error } = rejectSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ error: 'INVALID_PAYLOAD', details: error.details.map(d => d.message) });
  }

  const trace_id = getTraceId(req, value.trace_id);

  try {
    const existing = await findProposal(db, value.proposal_id);
    if (!existing) {
      return res.status(404).json({ error: 'PROPOSAL_NOT_FOUND', proposal_id: value.proposal_id, trace_id });
    }

    if (!isActionable(existing)) {
      let reason = 'PROPOSAL_NOT_ACTIONABLE';
      if (existing.status !== 'proposed') reason = 'ALREADY_' + String(existing.status || '').toUpperCase();
      else if (existing.expires_at && new Date(existing.expires_at) < new Date()) reason = 'EXPIRED';
      return res.status(403).json({ error: reason, proposal_id: value.proposal_id, trace_id });
    }

    const now = new Date().toISOString();

    await db('agent_action_proposals')
      .where({ proposal_id: value.proposal_id })
      .update({
        status: 'rejected',
        rejected_by: value.rejected_by,
        rejected_at: now,
        rejection_reason: value.reason || null,
        reviewer_comment: null, // clear approve-only comment
        trace_id: trace_id || existing.trace_id || null,
        updated_at: now,
      });

    const updated = await findProposal(db, value.proposal_id);

    return res.status(200).json(updated);
  } catch (err) {
    return res.status(500).json({ error: 'INTERNAL_ERROR', trace_id });
  }
});

module.exports = router;
