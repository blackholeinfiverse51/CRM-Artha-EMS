// agent_proposal_endpoint.js
// Day 1: Proposal submission only. No execution logic.

'use strict';

const express = require('express');
const Joi = require('joi');

// Assume db is an initialized query builder/ORM compatible with: db('agent_action_proposals').insert({...})
// For example: const db = require('./db');
const db = require('./db');

const router = express.Router();

// Joi schema for request validation
const schema = Joi.object({
  trace_id: Joi.string()
    .guid({ version: ['uuidv1', 'uuidv4'] })
    .required(),
  employee_id: Joi.alternatives()
    .try(
      Joi.string().trim().min(1).max(128),
      Joi.number().integer().min(0).max(Number.MAX_SAFE_INTEGER)
    )
    .required(),
  action_type: Joi.string()
    .pattern(/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/)
    .min(1)
    .max(128)
    .required(),
  action_payload: Joi.object().required(),
  proposed_by: Joi.string()
    .pattern(/^[a-z0-9]+(?:[-_][a-z0-9.]+)*$/)
    .min(1)
    .max(128)
    .required(),
  reason: Joi.string().min(1).max(2000).optional(),
  metadata: Joi.object().optional(),
  requested_at: Joi.string().isoDate().optional(),
}).required().unknown(false); // Disallow unknown fields for stricter safety

// Utility: derive trace id from headers if present
function getHeaderTraceId(req) {
  // Common header variations
  const header = req.headers['x-trace-id'] || req.headers['trace_id'] || req.headers['trace-id'];
  return typeof header === 'string' ? header : undefined;
}

router.post('/api/agent/propose-action', async (req, res) => {
  const start = Date.now();

  try {
    // Enforce JSON content-type when possible
    if (!req.is('application/json')) {
      return res.status(415).json({
        error: 'unsupported_media_type',
        message: 'Content-Type must be application/json',
      });
    }

    // Validate body
    const { value, error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        error: 'validation_error',
        details: error.details.map(d => ({ message: d.message, path: d.path })),
      });
    }

    // Validate header/body trace_id consistency if header present
    const headerTrace = getHeaderTraceId(req);
    if (headerTrace && headerTrace !== value.trace_id) {
      return res.status(400).json({
        error: 'trace_id_mismatch',
        message: 'X-Trace-Id header must match body.trace_id when provided',
      });
    }

    // Validate requested_at not in the future if provided
    if (value.requested_at) {
      const requestedAt = new Date(value.requested_at);
      if (Number.isNaN(requestedAt.getTime())) {
        return res.status(400).json({
          error: 'validation_error',
          details: [{ message: 'requested_at must be a valid ISO 8601 timestamp', path: ['requested_at'] }],
        });
      }
      if (requestedAt.getTime() > Date.now() + 1000) { // small clock skew allowance
        return res.status(400).json({
          error: 'validation_error',
          details: [{ message: 'requested_at cannot be in the future', path: ['requested_at'] }],
        });
      }
    }

    // Prepare record for insertion
    const nowIso = new Date().toISOString();
    const record = {
      trace_id: value.trace_id,
      employee_id: String(value.employee_id), // normalize to string for consistency
      action_type: value.action_type,
      action_payload: value.action_payload, // assume JSON column support; otherwise stringify in db layer
      proposed_by: value.proposed_by,
      reason: value.reason ?? null,
      metadata: value.metadata ?? null,
      status: 'proposed',
      requested_at: value.requested_at || nowIso,
      created_at: nowIso,
      updated_at: nowIso,
    };

    // Insert into DB
    // Expect returning id (Postgres) or capture inserted id depending on driver
    let insertedId;
    try {
      const result = await db('agent_action_proposals').insert(record).returning(['id']);
      if (Array.isArray(result) && result.length > 0) {
        // Knex on PG returns array of rows; on SQLite it may return array of ids
        if (typeof result[0] === 'object' && result[0] !== null && 'id' in result[0]) {
          insertedId = result[0].id;
        } else {
          insertedId = result[0];
        }
      }
    } catch (dbErr) {
      // Handle potential unique constraint violations or other DB errors
      if (dbErr && dbErr.code && (dbErr.code === '23505' || dbErr.code === 'SQLITE_CONSTRAINT')) {
        return res.status(409).json({
          error: 'conflict',
          message: 'A proposal with the same unique constraint already exists',
        });
      }
      throw dbErr;
    }

    // Fallback id generation if DB does not return id (not recommended but safe response)
    const proposalId = insertedId || null;

    // Response: never trigger execution here
    const response = {
      trace_id: value.trace_id,
      proposal_id: proposalId,
      status: 'proposed',
      duration_ms: Date.now() - start,
    };

    return res.status(201).json(response);
  } catch (err) {
    // Log with trace context if available; avoid leaking internals to client
    const traceId = (req.body && req.body.trace_id) || getHeaderTraceId(req) || undefined;
    console.error('propose-action error', { trace_id: traceId, err });
    return res.status(500).json({
      error: 'internal_error',
      message: 'An unexpected error occurred',
      trace_id: traceId || null,
    });
  }
});

module.exports = router;
