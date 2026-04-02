const express = require('express');
const auth = require('../middleware/auth');
const notificationService = require('../services/niyantran/notificationService');
const { resolveTraceId } = require('../services/niyantran/auditService');

const router = express.Router();

function setTraceHeader(res, traceId) {
  if (traceId) {
    res.setHeader('X-Trace-ID', traceId);
  }
}

router.post('/manual-trigger', auth, async (req, res) => {
  try {
    const traceId = resolveTraceId(req.header('x-trace-id') || req.body.trace_id);
    const { eventType, candidateId, data = {} } = req.body;

    const result = await notificationService.trigger(eventType, candidateId, {
      ...data,
      performedBy: req.user && req.user.id ? String(req.user.id) : 'system',
      trace_id: traceId,
    });

    setTraceHeader(res, traceId);
    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

router.post('/run-reminders', auth, async (req, res) => {
  try {
    const traceId = resolveTraceId(req.header('x-trace-id') || req.body.trace_id);

    const [taskDueReminders, ndaPendingReminders] = await Promise.all([
      notificationService.processTaskDueReminders(),
      notificationService.processNdaPendingReminders(),
    ]);

    setTraceHeader(res, traceId);
    return res.json({
      success: true,
      trace_id: traceId,
      taskDueRemindersCount: taskDueReminders.length,
      ndaPendingRemindersCount: ndaPendingReminders.length,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
