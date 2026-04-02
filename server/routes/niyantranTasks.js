const express = require('express');
const auth = require('../middleware/auth');
const {
  assignTask,
  editTask,
  softDeleteTask,
  reassignTask,
  getMyActiveTask,
  submitTask,
} = require('../services/niyantran/taskService');

const router = express.Router();

function extractPerformedBy(req) {
  return req.user && req.user.id ? String(req.user.id) : 'system';
}

function setTraceHeader(res, traceId) {
  if (traceId) {
    res.setHeader('X-Trace-ID', traceId);
  }
}

function getTraceFromRequest(req) {
  return req.header('x-trace-id') || req.body.trace_id || null;
}

function handleError(res, error) {
  const status = error.status || 400;
  return res.status(status).json({
    error: error.message,
    code: error.code || undefined,
  });
}

router.post('/assign', auth, async (req, res) => {
  try {
    const performedBy = extractPerformedBy(req);
    const result = await assignTask({
      candidateId: req.body.candidateId,
      title: req.body.title,
      description: req.body.description,
      instructions: req.body.instructions,
      attachedFiles: Array.isArray(req.body.attachedFiles) ? req.body.attachedFiles : [],
      dueDate: req.body.dueDate || null,
      performedBy,
      incomingTraceId: getTraceFromRequest(req),
    });

    setTraceHeader(res, result.trace_id);
    return res.status(201).json(result);
  } catch (error) {
    return handleError(res, error);
  }
});

router.patch('/:taskId', auth, async (req, res) => {
  try {
    const performedBy = extractPerformedBy(req);
    const result = await editTask({
      taskIdentifier: req.params.taskId,
      updates: req.body || {},
      performedBy,
      incomingTraceId: getTraceFromRequest(req),
    });

    setTraceHeader(res, result.trace_id);
    return res.json(result);
  } catch (error) {
    return handleError(res, error);
  }
});

router.delete('/:taskId', auth, async (req, res) => {
  try {
    const performedBy = extractPerformedBy(req);
    const result = await softDeleteTask({
      taskIdentifier: req.params.taskId,
      performedBy,
      reason: req.body && req.body.reason ? req.body.reason : 'Task deleted by recruiter',
      incomingTraceId: getTraceFromRequest(req),
    });

    setTraceHeader(res, result.trace_id);
    return res.json(result);
  } catch (error) {
    return handleError(res, error);
  }
});

router.post('/:taskId/reassign', auth, async (req, res) => {
  try {
    const performedBy = extractPerformedBy(req);
    const result = await reassignTask({
      taskIdentifier: req.params.taskId,
      title: req.body.title,
      description: req.body.description,
      instructions: req.body.instructions,
      attachedFiles: req.body.attachedFiles,
      dueDate: req.body.dueDate,
      performedBy,
      incomingTraceId: getTraceFromRequest(req),
    });

    setTraceHeader(res, result.trace_id);
    return res.status(201).json(result);
  } catch (error) {
    return handleError(res, error);
  }
});

router.get('/my-task', auth, async (req, res) => {
  try {
    const result = await getMyActiveTask({
      candidateId: req.query.candidateId,
      incomingTraceId: req.header('x-trace-id') || null,
    });

    setTraceHeader(res, result.trace_id);
    return res.json(result);
  } catch (error) {
    return handleError(res, error);
  }
});

router.post('/submit', auth, async (req, res) => {
  try {
    const performedBy = extractPerformedBy(req);

    const idempotencyKey =
      req.header('x-idempotency-key') ||
      req.body.idempotencyKey ||
      null;

    const result = await submitTask({
      taskIdentifier: req.body.taskId,
      candidateId: req.body.candidateId,
      submissionType: req.body.submissionType,
      content: req.body.content,
      fileUrls: Array.isArray(req.body.fileUrls) ? req.body.fileUrls : [],
      idempotencyKey,
      performedBy,
      incomingTraceId: getTraceFromRequest(req),
    });

    setTraceHeader(res, result.trace_id);
    return res.status(result.statusCode).json({
      ...result.responsePayload,
      replayed: result.replayed,
    });
  } catch (error) {
    return handleError(res, error);
  }
});

module.exports = router;
