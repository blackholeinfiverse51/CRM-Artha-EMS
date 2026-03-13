const express = require('express');
const router = express.Router();
const enhancedController = require('../controllers/enhancedAgentHistoryController');
const TraceMiddleware = require('../middleware/traceMiddleware');

// Apply trace middleware to all routes
router.use(TraceMiddleware.traceHandler());
router.use(TraceMiddleware.governanceEnforcer());

// GET /api/agent/trace/:trace_id - Get complete trace lifecycle
router.get('/trace/:trace_id', enhancedController.getTraceLifecycle);

// GET /api/agent/action-history - Get action history with trace propagation
router.get('/action-history', enhancedController.getActionHistoryWithTrace);

// POST /api/agent/action-history - Create action with governance
router.post('/action-history', enhancedController.createActionWithGovernance);

// PUT /api/agent/action-history/:trace_id/approval - Update approval with governance
router.put('/action-history/:trace_id/approval', enhancedController.updateApprovalWithGovernance);

// POST /api/agent/action-history/:trace_id/execute - Execute action with governance
router.post('/action-history/:trace_id/execute', enhancedController.executeActionWithGovernance);

// Governance validation endpoint
router.get('/governance/validate/:trace_id', async (req, res) => {
  try {
    const { trace_id } = req.params;
    
    const AgentActionHistory = require('../models/AgentActionHistory');
    const action = await AgentActionHistory.findOne({ trace_id }).lean();
    
    if (!action) {
      return res.status(404).json({
        success: false,
        error: 'Action not found',
        trace_id: req.trace_id
      });
    }

    const governance = {
      trace_id: action.trace_id,
      governance_rules: {
        ai_direct_execution: false, // Rule 1: AI cannot execute directly
        approval_required: action.approval_status === 'approved', // Rule 2: Requires approval
        execution_logged: action.execution_status !== 'not_executed', // Rule 3: Must be logged
        recoverable: true // Rule 4: All actions recoverable
      },
      compliance_status: 
        !action.action_type.includes('direct_execute') && 
        (action.execution_status === 'not_executed' || action.approval_status === 'approved') &&
        action.trace_id && action.proposal_source,
      audit_trail: {
        proposal_logged: !!action.timestamp_proposed,
        approval_logged: !!action.timestamp_approved,
        execution_logged: !!action.timestamp_executed
      }
    };

    TraceMiddleware.logWithTrace(req.trace_id, 'info', 'Governance validation completed', {
      target_trace_id: trace_id,
      compliance_status: governance.compliance_status
    });

    res.json({
      success: true,
      data: governance,
      trace_id: req.trace_id
    });
  } catch (error) {
    TraceMiddleware.logWithTrace(req.trace_id, 'error', 'Governance validation failed', { 
      error: error.message 
    });
    
    res.status(500).json({
      success: false,
      error: 'Governance validation failed',
      details: error.message,
      trace_id: req.trace_id
    });
  }
});

module.exports = router;