const AgentActionHistory = require('../models/AgentActionHistory');
const TraceMiddleware = require('../middleware/traceMiddleware');
const { v4: uuidv4 } = require('uuid');

class EnhancedAgentHistoryController {
  // Get complete trace lifecycle
  async getTraceLifecycle(req, res) {
    try {
      const { trace_id } = req.params;
      
      const action = await AgentActionHistory.findOne({ trace_id }).lean();
      
      if (!action) {
        TraceMiddleware.logWithTrace(req.trace_id, 'warn', 'Trace not found', { requested_trace_id: trace_id });
        return res.status(404).json({
          success: false,
          error: 'Trace not found',
          trace_id: req.trace_id
        });
      }

      // Build complete trace lifecycle
      const traceLifecycle = {
        trace_id: action.trace_id,
        proposal: {
          proposal_id: action.proposal_id,
          proposal_source: action.proposal_source,
          action_type: action.action_type,
          action_payload: action.action_payload,
          timestamp_proposed: action.timestamp_proposed
        },
        approval: {
          approval_status: action.approval_status,
          approval_identity: action.approval_identity,
          timestamp_approved: action.timestamp_approved
        },
        execution: {
          execution_status: action.execution_status,
          execution_result: action.execution_result,
          timestamp_executed: action.timestamp_executed
        },
        governance: {
          ai_direct_execution: false,
          approval_required: true,
          execution_logged: action.execution_status !== 'not_executed',
          recoverable: true
        },
        audit_trail: {
          created_at: action.createdAt,
          updated_at: action.updatedAt,
          total_duration_minutes: action.timestamp_executed && action.timestamp_proposed ? 
            Math.round((new Date(action.timestamp_executed) - new Date(action.timestamp_proposed)) / 60000) : null
        }
      };

      TraceMiddleware.logWithTrace(req.trace_id, 'info', 'Trace lifecycle retrieved', { 
        requested_trace_id: trace_id,
        status: action.execution_status 
      });

      res.json({
        success: true,
        data: traceLifecycle,
        trace_id: req.trace_id
      });
    } catch (error) {
      TraceMiddleware.logWithTrace(req.trace_id, 'error', 'Failed to retrieve trace lifecycle', { 
        error: error.message 
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve trace lifecycle',
        details: error.message,
        trace_id: req.trace_id
      });
    }
  }

  // Create action with governance enforcement
  async createActionWithGovernance(req, res) {
    try {
      const {
        proposal_id,
        proposal_source,
        action_type,
        action_payload
      } = req.body;

      // Validate trace fields
      const traceData = {
        trace_id: req.trace_id,
        proposal_source,
        timestamp: new Date().toISOString()
      };
      
      TraceMiddleware.validateTraceFields(traceData);

      // Governance Rule 1: Ensure AI cannot execute directly
      if (req.headers['user-agent']?.includes('ai-agent') && action_type.includes('execute')) {
        TraceMiddleware.logWithTrace(req.trace_id, 'warn', 'AI attempted direct execution', {
          proposal_source,
          action_type
        });
        
        return res.status(403).json({
          success: false,
          error: 'AI agents cannot execute actions directly',
          governance_rule: 'AI_EXECUTION_FORBIDDEN',
          trace_id: req.trace_id
        });
      }

      const action = new AgentActionHistory({
        trace_id: req.trace_id,
        proposal_id,
        proposal_source,
        action_type,
        action_payload
      });

      await action.save();

      // Log AI proposal created with full trace context
      TraceMiddleware.logWithTrace(req.trace_id, 'info', 'AI_PROPOSAL_CREATED', {
        proposal_id,
        proposal_source,
        action_type,
        governance_compliant: true
      });

      res.status(201).json({
        success: true,
        data: {
          trace_id: req.trace_id,
          proposal_id,
          status: 'created',
          governance_status: 'compliant'
        },
        trace_id: req.trace_id
      });
    } catch (error) {
      TraceMiddleware.logWithTrace(req.trace_id, 'error', 'Failed to create action', { 
        error: error.message 
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to create action record',
        details: error.message,
        trace_id: req.trace_id
      });
    }
  }

  // Update approval with governance
  async updateApprovalWithGovernance(req, res) {
    try {
      const { trace_id } = req.params;
      const { approval_status, approval_identity } = req.body;

      // Governance Rule 2: Validate approval identity
      if (!approval_identity) {
        return res.status(400).json({
          success: false,
          error: 'Approval identity required for governance',
          governance_rule: 'APPROVAL_IDENTITY_REQUIRED',
          trace_id: req.trace_id
        });
      }

      const action = await AgentActionHistory.findOneAndUpdate(
        { trace_id },
        {
          approval_status,
          approval_identity,
          timestamp_approved: new Date()
        },
        { new: true }
      );

      if (!action) {
        TraceMiddleware.logWithTrace(req.trace_id, 'warn', 'Action not found for approval', { 
          target_trace_id: trace_id 
        });
        
        return res.status(404).json({
          success: false,
          error: 'Action not found',
          trace_id: req.trace_id
        });
      }

      // Log human approval with governance context
      TraceMiddleware.logWithTrace(req.trace_id, 'info', 'HUMAN_APPROVED_ACTION', {
        target_trace_id: trace_id,
        approval_status,
        approval_identity,
        governance_compliant: true
      });

      res.json({
        success: true,
        data: {
          trace_id,
          approval_status,
          timestamp_approved: action.timestamp_approved,
          governance_status: 'approved'
        },
        trace_id: req.trace_id
      });
    } catch (error) {
      TraceMiddleware.logWithTrace(req.trace_id, 'error', 'Failed to update approval', { 
        error: error.message 
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to update approval',
        details: error.message,
        trace_id: req.trace_id
      });
    }
  }

  // Execute action with full governance
  async executeActionWithGovernance(req, res) {
    try {
      const { trace_id } = req.params;
      const { execution_result } = req.body;

      // Find the action first
      const action = await AgentActionHistory.findOne({ trace_id });
      
      if (!action) {
        return res.status(404).json({
          success: false,
          error: 'Action not found',
          trace_id: req.trace_id
        });
      }

      // Governance Rule 3: Execution requires approval
      if (action.approval_status !== 'approved') {
        TraceMiddleware.logWithTrace(req.trace_id, 'warn', 'Execution attempted without approval', {
          target_trace_id: trace_id,
          current_status: action.approval_status
        });
        
        return res.status(403).json({
          success: false,
          error: 'Execution requires approved status',
          governance_rule: 'APPROVAL_REQUIRED',
          current_status: action.approval_status,
          trace_id: req.trace_id
        });
      }

      // Update execution status
      const updatedAction = await AgentActionHistory.findOneAndUpdate(
        { trace_id },
        {
          execution_status: 'executed',
          execution_result,
          timestamp_executed: new Date()
        },
        { new: true }
      );

      // Governance Rule 4: Log execution for recoverability
      TraceMiddleware.logWithTrace(req.trace_id, 'info', 'WORKFLOW_EXECUTION_STARTED', {
        target_trace_id: trace_id,
        action_type: action.action_type,
        governance_compliant: true
      });

      TraceMiddleware.logWithTrace(req.trace_id, 'info', 'WORKFLOW_EXECUTION_COMPLETED', {
        target_trace_id: trace_id,
        execution_result,
        recoverable: true
      });

      res.json({
        success: true,
        data: {
          trace_id,
          execution_status: 'executed',
          timestamp_executed: updatedAction.timestamp_executed,
          governance_status: 'compliant',
          recoverable: true
        },
        trace_id: req.trace_id
      });
    } catch (error) {
      TraceMiddleware.logWithTrace(req.trace_id, 'error', 'Failed to execute action', { 
        error: error.message 
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to execute action',
        details: error.message,
        trace_id: req.trace_id
      });
    }
  }

  // Get action history with trace propagation
  async getActionHistoryWithTrace(req, res) {
    try {
      const {
        status,
        trace_id,
        proposal_id,
        action_type,
        start_date,
        end_date,
        limit = 50,
        page = 1
      } = req.query;

      const filter = {};
      
      if (status) filter.approval_status = status;
      if (trace_id) filter.trace_id = trace_id;
      if (proposal_id) filter.proposal_id = proposal_id;
      if (action_type) filter.action_type = action_type;
      
      if (start_date || end_date) {
        filter.timestamp_proposed = {};
        if (start_date) filter.timestamp_proposed.$gte = new Date(start_date);
        if (end_date) filter.timestamp_proposed.$lte = new Date(end_date);
      }

      const skip = (page - 1) * limit;
      
      const [history, total] = await Promise.all([
        AgentActionHistory.find(filter)
          .sort({ timestamp_proposed: -1 })
          .limit(parseInt(limit))
          .skip(skip)
          .lean(),
        AgentActionHistory.countDocuments(filter)
      ]);

      TraceMiddleware.logWithTrace(req.trace_id, 'info', 'Action history retrieved', {
        filter_applied: Object.keys(filter),
        records_returned: history.length,
        total_records: total
      });

      res.json({
        success: true,
        data: {
          history,
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
      TraceMiddleware.logWithTrace(req.trace_id, 'error', 'Failed to retrieve action history', { 
        error: error.message 
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve action history',
        details: error.message,
        trace_id: req.trace_id
      });
    }
  }
}

module.exports = new EnhancedAgentHistoryController();