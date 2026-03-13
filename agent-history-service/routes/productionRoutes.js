const express = require('express');
const router = express.Router();
const productionController = require('../controllers/productionAgentController');
const TraceMiddleware = require('../middleware/traceMiddleware');

// Apply trace middleware to all routes
router.use(TraceMiddleware.traceHandler());
router.use(TraceMiddleware.governanceEnforcer());

// Step 1: AI Proposal Endpoint
router.post('/propose', productionController.proposeAction);

// Step 2: Human Approval Endpoint
router.post('/approve/:proposal_id', productionController.approveAction);

// Get proposal status
router.get('/status/:proposal_id', productionController.getProposalStatus);

// Batch operations for production efficiency
router.get('/proposals/pending', async (req, res) => {
  try {
    const { limit = 50, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    const pendingProposals = await require('../models/AgentActionHistory')
      .find({ approval_status: 'pending' })
      .sort({ timestamp_proposed: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    const total = await require('../models/AgentActionHistory')
      .countDocuments({ approval_status: 'pending' });

    TraceMiddleware.logWithTrace(req.trace_id, 'info', 'PENDING_PROPOSALS_RETRIEVED', {
      count: pendingProposals.length,
      total_pending: total
    });

    res.json({
      success: true,
      data: {
        proposals: pendingProposals,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / limit),
          total_records: total,
          limit: parseInt(limit)
        }
      },
      trace_id: req.trace_id
    });
  } catch (error) {
    TraceMiddleware.logWithTrace(req.trace_id, 'error', 'PENDING_PROPOSALS_FAILED', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve pending proposals',
      details: error.message,
      trace_id: req.trace_id
    });
  }
});

// Batch approval for production efficiency
router.post('/approve/batch', async (req, res) => {
  try {
    const { approvals, approval_identity } = req.body;

    if (!Array.isArray(approvals) || !approval_identity) {
      return res.status(400).json({
        success: false,
        error: 'approvals array and approval_identity are required',
        trace_id: req.trace_id
      });
    }

    const results = [];
    const AgentActionHistory = require('../models/AgentActionHistory');

    for (const approval of approvals) {
      try {
        const { proposal_id, approval_status, approval_notes } = approval;

        const action = await AgentActionHistory.findOneAndUpdate(
          { proposal_id },
          {
            approval_status,
            approval_identity,
            approval_notes: approval_notes || '',
            timestamp_approved: new Date()
          },
          { new: true }
        );

        if (action) {
          TraceMiddleware.logWithTrace(req.trace_id, 'info', 'BATCH_APPROVAL_PROCESSED', {
            proposal_id,
            approval_status,
            approval_identity
          });

          results.push({
            proposal_id,
            success: true,
            trace_id: action.trace_id,
            status: approval_status
          });

          // Trigger execution if approved
          if (approval_status === 'approved') {
            try {
              await productionController.triggerWorkflowExecutor(action);
            } catch (executorError) {
              TraceMiddleware.logWithTrace(req.trace_id, 'error', 'BATCH_EXECUTOR_FAILED', {
                proposal_id,
                error: executorError.message
              });
            }
          }
        } else {
          results.push({
            proposal_id,
            success: false,
            error: 'Proposal not found'
          });
        }
      } catch (error) {
        results.push({
          proposal_id: approval.proposal_id,
          success: false,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      data: {
        processed: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      },
      trace_id: req.trace_id
    });
  } catch (error) {
    TraceMiddleware.logWithTrace(req.trace_id, 'error', 'BATCH_APPROVAL_FAILED', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: 'Batch approval failed',
      details: error.message,
      trace_id: req.trace_id
    });
  }
});

// Production monitoring endpoint
router.get('/monitoring/stats', async (req, res) => {
  try {
    const AgentActionHistory = require('../models/AgentActionHistory');
    
    const stats = await AgentActionHistory.aggregate([
      {
        $group: {
          _id: null,
          total_proposals: { $sum: 1 },
          pending_approvals: {
            $sum: { $cond: [{ $eq: ['$approval_status', 'pending'] }, 1, 0] }
          },
          approved_actions: {
            $sum: { $cond: [{ $eq: ['$approval_status', 'approved'] }, 1, 0] }
          },
          rejected_actions: {
            $sum: { $cond: [{ $eq: ['$approval_status', 'rejected'] }, 1, 0] }
          },
          executed_actions: {
            $sum: { $cond: [{ $eq: ['$execution_status', 'executed'] }, 1, 0] }
          },
          failed_executions: {
            $sum: { $cond: [{ $eq: ['$execution_status', 'failed'] }, 1, 0] }
          }
        }
      }
    ]);

    const actionTypeStats = await AgentActionHistory.aggregate([
      {
        $group: {
          _id: '$action_type',
          count: { $sum: 1 },
          success_rate: {
            $avg: { $cond: [{ $eq: ['$execution_status', 'executed'] }, 1, 0] }
          }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      data: {
        overview: stats[0] || {
          total_proposals: 0,
          pending_approvals: 0,
          approved_actions: 0,
          rejected_actions: 0,
          executed_actions: 0,
          failed_executions: 0
        },
        action_types: actionTypeStats,
        timestamp: new Date().toISOString()
      },
      trace_id: req.trace_id
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve monitoring stats',
      details: error.message,
      trace_id: req.trace_id
    });
  }
});

module.exports = router;