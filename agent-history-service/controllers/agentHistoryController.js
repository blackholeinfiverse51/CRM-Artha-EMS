const AgentActionHistory = require('../models/AgentActionHistory');
const { v4: uuidv4 } = require('uuid');

class AgentHistoryController {
  // Get action history with filters and pagination
  async getActionHistory(req, res) {
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
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve action history',
        details: error.message
      });
    }
  }

  // Get single action by trace_id
  async getActionByTraceId(req, res) {
    try {
      const { trace_id } = req.params;
      
      const action = await AgentActionHistory.findOne({ trace_id }).lean();
      
      if (!action) {
        return res.status(404).json({
          success: false,
          error: 'Action not found'
        });
      }

      res.json({
        success: true,
        data: action
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve action',
        details: error.message
      });
    }
  }

  // Create new action record
  async createAction(req, res) {
    try {
      const {
        proposal_id,
        proposal_source,
        action_type,
        action_payload
      } = req.body;

      const trace_id = uuidv4();

      const action = new AgentActionHistory({
        trace_id,
        proposal_id,
        proposal_source,
        action_type,
        action_payload
      });

      await action.save();

      // Log AI proposal created
      console.log(`[${new Date().toISOString()}] AI_PROPOSAL_CREATED - trace_id: ${trace_id}, proposal_id: ${proposal_id}`);

      res.status(201).json({
        success: true,
        data: {
          trace_id,
          proposal_id,
          status: 'created'
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to create action record',
        details: error.message
      });
    }
  }

  // Update approval status
  async updateApproval(req, res) {
    try {
      const { trace_id } = req.params;
      const { approval_status, approval_identity } = req.body;

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
        return res.status(404).json({
          success: false,
          error: 'Action not found'
        });
      }

      // Log human approval
      console.log(`[${new Date().toISOString()}] HUMAN_APPROVED_ACTION - trace_id: ${trace_id}, status: ${approval_status}, user: ${approval_identity}`);

      res.json({
        success: true,
        data: {
          trace_id,
          approval_status,
          timestamp_approved: action.timestamp_approved
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to update approval',
        details: error.message
      });
    }
  }

  // Update execution status
  async updateExecution(req, res) {
    try {
      const { trace_id } = req.params;
      const { execution_status, execution_result } = req.body;

      const action = await AgentActionHistory.findOneAndUpdate(
        { trace_id },
        {
          execution_status,
          execution_result,
          timestamp_executed: new Date()
        },
        { new: true }
      );

      if (!action) {
        return res.status(404).json({
          success: false,
          error: 'Action not found'
        });
      }

      // Log workflow execution
      const logStatus = execution_status === 'executed' ? 'WORKFLOW_EXECUTION_COMPLETED' : 'WORKFLOW_EXECUTION_STARTED';
      console.log(`[${new Date().toISOString()}] ${logStatus} - trace_id: ${trace_id}, status: ${execution_status}`);

      res.json({
        success: true,
        data: {
          trace_id,
          execution_status,
          timestamp_executed: action.timestamp_executed
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to update execution',
        details: error.message
      });
    }
  }
}

module.exports = new AgentHistoryController();