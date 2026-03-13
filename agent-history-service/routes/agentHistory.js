const express = require('express');
const router = express.Router();
const agentHistoryController = require('../controllers/agentHistoryController');

// GET /api/agent/action-history - Get action history with filters
router.get('/action-history', agentHistoryController.getActionHistory);

// GET /api/agent/action-history/:trace_id - Get single action by trace_id
router.get('/action-history/:trace_id', agentHistoryController.getActionByTraceId);

// POST /api/agent/action-history - Create new action record
router.post('/action-history', agentHistoryController.createAction);

// PUT /api/agent/action-history/:trace_id/approval - Update approval status
router.put('/action-history/:trace_id/approval', agentHistoryController.updateApproval);

// PUT /api/agent/action-history/:trace_id/execution - Update execution status
router.put('/action-history/:trace_id/execution', agentHistoryController.updateExecution);

module.exports = router;