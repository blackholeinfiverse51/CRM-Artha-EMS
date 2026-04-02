const express = require('express');
const auth = require('../middleware/auth');
const { executeMutationWithOptionalIdempotency } = require('../services/niyantran/idempotencyService');
const { resolveTraceId } = require('../services/niyantran/auditService');
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
  return req.header('x-trace-id') || (req.body && req.body.trace_id) || null;
}

function getIdempotencyKey(req) {
  return req.header('x-idempotency-key') || (req.body && req.body.idempotencyKey) || null;
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
    const traceId = resolveTraceId(getTraceFromRequest(req));
    const candidateId = req.body.candidateId;

    const wrapped = await executeMutationWithOptionalIdempotency({
      idempotencyKey: getIdempotencyKey(req),
      action: 'assign_task',
      candidateId,
      traceId,
      requestPayload: req.body,
      handler: async () => {
        const result = await assignTask({
          candidateId,
          title: req.body.title,
          description: req.body.description,
          instructions: req.body.instructions,
          attachedFiles: Array.isArray(req.body.attachedFiles) ? req.body.attachedFiles : [],
          dueDate: req.body.dueDate || null,
          performedBy,
          incomingTraceId: traceId,
        });

        return {
          statusCode: 201,
          trace_id: result.trace_id,
          responsePayload: result,
        };
      },
    });

    setTraceHeader(res, wrapped.trace_id);
    return res.status(wrapped.statusCode).json({
      ...wrapped.responsePayload,
      replayed: wrapped.replayed,
    });
  } catch (error) {
    return handleError(res, error);
  }
});

router.patch('/:taskId', auth, async (req, res) => {
  try {
    const performedBy = extractPerformedBy(req);
    const traceId = resolveTraceId(getTraceFromRequest(req));

    const wrapped = await executeMutationWithOptionalIdempotency({
      idempotencyKey: getIdempotencyKey(req),
      action: 'edit_task',
      candidateId: req.body.candidateId || null,
      taskId: req.params.taskId,
      traceId,
      requestPayload: {
        taskId: req.params.taskId,
        updates: req.body || {},
      },
      handler: async () => {
        const result = await editTask({
          taskIdentifier: req.params.taskId,
          updates: req.body || {},
          performedBy,
          incomingTraceId: traceId,
        });

        return {
          statusCode: 200,
          trace_id: result.trace_id,
          responsePayload: result,
        };
      },
    });

    setTraceHeader(res, wrapped.trace_id);
    return res.status(wrapped.statusCode).json({
      ...wrapped.responsePayload,
      replayed: wrapped.replayed,
    });
  } catch (error) {
    return handleError(res, error);
  }
});

router.delete('/:taskId', auth, async (req, res) => {
  try {
    const performedBy = extractPerformedBy(req);
    const traceId = resolveTraceId(getTraceFromRequest(req));

    const wrapped = await executeMutationWithOptionalIdempotency({
      idempotencyKey: getIdempotencyKey(req),
      action: 'delete_task',
      candidateId: (req.body && req.body.candidateId) || null,
      taskId: req.params.taskId,
      traceId,
      requestPayload: {
        taskId: req.params.taskId,
        reason: req.body && req.body.reason ? req.body.reason : 'Task deleted by recruiter',
      },
      handler: async () => {
        const result = await softDeleteTask({
          taskIdentifier: req.params.taskId,
          performedBy,
          reason: req.body && req.body.reason ? req.body.reason : 'Task deleted by recruiter',
          incomingTraceId: traceId,
        });

        return {
          statusCode: 200,
          trace_id: result.trace_id,
          responsePayload: result,
        };
      },
    });

    setTraceHeader(res, wrapped.trace_id);
    return res.status(wrapped.statusCode).json({
      ...wrapped.responsePayload,
      replayed: wrapped.replayed,
    });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post('/:taskId/reassign', auth, async (req, res) => {
  try {
    const performedBy = extractPerformedBy(req);
    const traceId = resolveTraceId(getTraceFromRequest(req));

    const wrapped = await executeMutationWithOptionalIdempotency({
      idempotencyKey: getIdempotencyKey(req),
      action: 'reassign_task',
      candidateId: req.body.candidateId || null,
      taskId: req.params.taskId,
      traceId,
      requestPayload: {
        taskId: req.params.taskId,
        title: req.body.title,
        description: req.body.description,
        instructions: req.body.instructions,
        attachedFiles: req.body.attachedFiles,
        dueDate: req.body.dueDate,
      },
      handler: async () => {
        const result = await reassignTask({
          taskIdentifier: req.params.taskId,
          title: req.body.title,
          description: req.body.description,
          instructions: req.body.instructions,
          attachedFiles: req.body.attachedFiles,
          dueDate: req.body.dueDate,
          performedBy,
          incomingTraceId: traceId,
        });

        return {
          statusCode: 201,
          trace_id: result.trace_id,
          responsePayload: result,
        };
      },
    });

    setTraceHeader(res, wrapped.trace_id);
    return res.status(wrapped.statusCode).json({
      ...wrapped.responsePayload,
      replayed: wrapped.replayed,
    });
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

    const result = await submitTask({
      taskIdentifier: req.body.taskId,
      candidateId: req.body.candidateId,
      submissionType: req.body.submissionType,
      content: req.body.content,
      fileUrls: Array.isArray(req.body.fileUrls) ? req.body.fileUrls : [],
      idempotencyKey: getIdempotencyKey(req),
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
