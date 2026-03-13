const AgentActionHistory = require('../models/AgentActionHistory');
const TraceMiddleware = require('../middleware/traceMiddleware');
const { v4: uuidv4 } = require('uuid');

class ProductionAgentController {
  // Step 1: AI Proposal Endpoint
  async proposeAction(req, res) {
    try {
      const {
        action_type,
        action_payload,
        proposal_source = 'ai_agent',
        priority = 'medium'
      } = req.body;

      // Validate required fields
      if (!action_type || !action_payload) {
        return res.status(400).json({
          success: false,
          error: 'action_type and action_payload are required',
          trace_id: req.trace_id
        });
      }

      const proposal_id = `prop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const action = new AgentActionHistory({
        trace_id: req.trace_id,
        proposal_id,
        proposal_source,
        action_type,
        action_payload: {
          ...action_payload,
          priority,
          proposed_at: new Date().toISOString()
        }
      });

      await action.save();

      // Production monitoring log
      TraceMiddleware.logWithTrace(req.trace_id, 'info', 'AGENT_ACTION_PROPOSED', {
        proposal_id,
        action_type,
        proposal_source,
        priority,
        payload_size: JSON.stringify(action_payload).length
      });

      res.status(201).json({
        success: true,
        data: {
          trace_id: req.trace_id,
          proposal_id,
          action_type,
          status: 'proposed',
          next_step: 'awaiting_human_approval'
        },
        trace_id: req.trace_id
      });
    } catch (error) {
      TraceMiddleware.logWithTrace(req.trace_id, 'error', 'AGENT_PROPOSAL_FAILED', { 
        error: error.message 
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to create proposal',
        details: error.message,
        trace_id: req.trace_id
      });
    }
  }

  // Step 2: Human Approval Endpoint
  async approveAction(req, res) {
    try {
      const { proposal_id } = req.params;
      const { 
        approval_status, 
        approval_identity, 
        approval_notes = '',
        approval_conditions = null 
      } = req.body;

      // Validate approval status
      if (!['approved', 'rejected'].includes(approval_status)) {
        return res.status(400).json({
          success: false,
          error: 'approval_status must be "approved" or "rejected"',
          trace_id: req.trace_id
        });
      }

      // Validate approval identity
      if (!approval_identity) {
        return res.status(400).json({
          success: false,
          error: 'approval_identity is required for governance',
          trace_id: req.trace_id
        });
      }

      const action = await AgentActionHistory.findOneAndUpdate(
        { proposal_id },
        {
          approval_status,
          approval_identity,
          approval_notes,
          approval_conditions,
          timestamp_approved: new Date()
        },
        { new: true }
      );

      if (!action) {
        return res.status(404).json({
          success: false,
          error: 'Proposal not found',
          trace_id: req.trace_id
        });
      }

      // Production monitoring log
      TraceMiddleware.logWithTrace(req.trace_id, 'info', 'AGENT_ACTION_APPROVED', {
        proposal_id,
        trace_id: action.trace_id,
        approval_status,
        approval_identity,
        action_type: action.action_type,
        has_conditions: !!approval_conditions
      });

      // If approved, trigger workflow executor
      let execution_triggered = false;
      if (approval_status === 'approved') {
        try {
          await this.triggerWorkflowExecutor(action);
          execution_triggered = true;
        } catch (executorError) {
          TraceMiddleware.logWithTrace(req.trace_id, 'error', 'EXECUTOR_TRIGGER_FAILED', {
            proposal_id,
            error: executorError.message
          });
        }
      }

      res.json({
        success: true,
        data: {
          trace_id: action.trace_id,
          proposal_id,
          approval_status,
          timestamp_approved: action.timestamp_approved,
          execution_triggered,
          next_step: approval_status === 'approved' ? 'workflow_execution' : 'proposal_rejected'
        },
        trace_id: req.trace_id
      });
    } catch (error) {
      TraceMiddleware.logWithTrace(req.trace_id, 'error', 'APPROVAL_FAILED', { 
        error: error.message 
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to process approval',
        details: error.message,
        trace_id: req.trace_id
      });
    }
  }

  // Step 3: Workflow Executor Trigger
  async triggerWorkflowExecutor(action) {
    const { trace_id, action_type, action_payload } = action;

    TraceMiddleware.logWithTrace(trace_id, 'info', 'AGENT_EXECUTION_STARTED', {
      trace_id,
      action_type,
      executor: 'workflow_executor'
    });

    try {
      let execution_result = {};

      // Route to appropriate service based on action type
      switch (true) {
        case action_type.startsWith('inventory_'):
          execution_result = await this.executeInventoryAction(action);
          break;
        case action_type.startsWith('employee_'):
          execution_result = await this.executeEmployeeAction(action);
          break;
        case action_type.startsWith('customer_'):
          execution_result = await this.executeCustomerAction(action);
          break;
        case action_type.startsWith('finance_'):
          execution_result = await this.executeFinanceAction(action);
          break;
        default:
          execution_result = await this.executeGenericAction(action);
      }

      // Update action with execution result
      await AgentActionHistory.findOneAndUpdate(
        { trace_id },
        {
          execution_status: 'executed',
          execution_result,
          timestamp_executed: new Date()
        }
      );

      TraceMiddleware.logWithTrace(trace_id, 'info', 'AGENT_EXECUTION_FINISHED', {
        trace_id,
        action_type,
        execution_success: true,
        result_keys: Object.keys(execution_result)
      });

      return execution_result;
    } catch (error) {
      // Update action with failure
      await AgentActionHistory.findOneAndUpdate(
        { trace_id },
        {
          execution_status: 'failed',
          execution_result: {
            error: error.message,
            failed_at: new Date().toISOString()
          },
          timestamp_executed: new Date()
        }
      );

      TraceMiddleware.logWithTrace(trace_id, 'error', 'AGENT_EXECUTION_FAILED', {
        trace_id,
        action_type,
        error: error.message
      });

      throw error;
    }
  }

  // Inventory Action Executor
  async executeInventoryAction(action) {
    const { action_type, action_payload } = action;
    
    switch (action_type) {
      case 'inventory_restock':
        return {
          action: 'inventory_restock',
          product_id: action_payload.product_id,
          quantity_added: action_payload.quantity,
          new_stock_level: action_payload.current_stock + action_payload.quantity,
          supplier_notified: true,
          po_number: `PO-${Date.now()}`,
          estimated_delivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          executed_at: new Date().toISOString()
        };
      
      case 'inventory_alert':
        return {
          action: 'inventory_alert',
          alert_sent: true,
          recipients: ['inventory@company.com', 'manager@company.com'],
          alert_level: action_payload.urgency || 'medium',
          executed_at: new Date().toISOString()
        };
      
      default:
        return {
          action: action_type,
          status: 'executed',
          executed_at: new Date().toISOString()
        };
    }
  }

  // Employee Action Executor
  async executeEmployeeAction(action) {
    const { action_type, action_payload } = action;
    
    return {
      action: action_type,
      employee_id: action_payload.employee_id,
      changes_applied: true,
      notification_sent: true,
      executed_at: new Date().toISOString()
    };
  }

  // Customer Action Executor
  async executeCustomerAction(action) {
    const { action_type, action_payload } = action;
    
    return {
      action: action_type,
      customer_id: action_payload.customer_id,
      update_applied: true,
      crm_updated: true,
      executed_at: new Date().toISOString()
    };
  }

  // Finance Action Executor
  async executeFinanceAction(action) {
    const { action_type, action_payload } = action;
    
    return {
      action: action_type,
      transaction_id: `TXN-${Date.now()}`,
      amount_processed: action_payload.amount,
      ledger_updated: true,
      executed_at: new Date().toISOString()
    };
  }

  // Generic Action Executor
  async executeGenericAction(action) {
    return {
      action: action.action_type,
      status: 'executed',
      payload_processed: true,
      executed_at: new Date().toISOString()
    };
  }

  // Get proposal status
  async getProposalStatus(req, res) {
    try {
      const { proposal_id } = req.params;
      
      const action = await AgentActionHistory.findOne({ proposal_id }).lean();
      
      if (!action) {
        return res.status(404).json({
          success: false,
          error: 'Proposal not found',
          trace_id: req.trace_id
        });
      }

      const status = {
        trace_id: action.trace_id,
        proposal_id: action.proposal_id,
        action_type: action.action_type,
        current_status: this.determineCurrentStatus(action),
        approval_status: action.approval_status,
        execution_status: action.execution_status,
        timeline: {
          proposed: action.timestamp_proposed,
          approved: action.timestamp_approved,
          executed: action.timestamp_executed
        },
        next_action: this.determineNextAction(action)
      };

      res.json({
        success: true,
        data: status,
        trace_id: req.trace_id
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get proposal status',
        details: error.message,
        trace_id: req.trace_id
      });
    }
  }

  // Helper methods
  determineCurrentStatus(action) {
    if (action.execution_status === 'executed') return 'completed';
    if (action.execution_status === 'failed') return 'execution_failed';
    if (action.approval_status === 'approved') return 'approved_pending_execution';
    if (action.approval_status === 'rejected') return 'rejected';
    return 'pending_approval';
  }

  determineNextAction(action) {
    if (action.execution_status === 'executed') return 'none';
    if (action.execution_status === 'failed') return 'retry_execution';
    if (action.approval_status === 'approved') return 'execute_workflow';
    if (action.approval_status === 'rejected') return 'none';
    return 'await_approval';
  }
}

module.exports = new ProductionAgentController();