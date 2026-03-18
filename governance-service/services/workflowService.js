const Proposal = require('../models/Proposal');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

const workflowHandlers = {
  'CREATE_EMPLOYEE': async (payload, trace_id) => {
    const response = await axios.post('http://localhost:5001/api/employees', payload, {
      headers: { 'X-Trace-ID': trace_id }
    });
    return response.data;
  },
  'UPDATE_INVENTORY': async (payload, trace_id) => {
    const response = await axios.put(`http://localhost:8000/api/inventory/${payload.item_id}`, payload, {
      headers: { 'X-Trace-ID': trace_id }
    });
    return response.data;
  },
  'CREATE_EXPENSE': async (payload, trace_id) => {
    const response = await axios.post('http://localhost:5002/api/expenses', payload, {
      headers: { 'X-Trace-ID': trace_id }
    });
    return response.data;
  },
  'CREATE_LEAD': async (payload, trace_id) => {
    const response = await axios.post('http://localhost:8000/api/leads', payload, {
      headers: { 'X-Trace-ID': trace_id }
    });
    return response.data;
  }
};

class WorkflowService {
  async executeProposal(proposal_id) {
    const proposal = await Proposal.findOne({ proposal_id });
    
    if (!proposal || proposal.status !== 'APPROVED') {
      throw new Error('Only APPROVED proposals can be executed');
    }

    const execution_id = uuidv4();
    const logs = [];

    try {
      logs.push(`[${new Date().toISOString()}] Starting execution for ${proposal.action_type}`);
      
      const handler = workflowHandlers[proposal.action_type];
      if (!handler) {
        throw new Error(`No handler for action_type: ${proposal.action_type}`);
      }

      const result = await handler(proposal.payload, proposal.trace_id);
      
      logs.push(`[${new Date().toISOString()}] Execution successful`);

      proposal.status = 'EXECUTED';
      proposal.execution_id = execution_id;
      proposal.execution_status = 'SUCCESS';
      proposal.execution_logs = logs;
      proposal.executed_at = new Date();
      await proposal.save();

      return { execution_id, result, proposal };
    } catch (error) {
      logs.push(`[${new Date().toISOString()}] Execution failed: ${error.message}`);
      
      proposal.execution_id = execution_id;
      proposal.execution_status = 'FAILURE';
      proposal.execution_logs = logs;
      proposal.errors = [error.message];
      proposal.executed_at = new Date();
      await proposal.save();

      throw error;
    }
  }

  async recordOutcome(proposal_id, outcome_summary, impact_metrics = {}) {
    const proposal = await Proposal.findOne({ proposal_id });
    
    if (!proposal || proposal.status !== 'EXECUTED') {
      throw new Error('Proposal must be executed first');
    }

    proposal.status = 'COMPLETED';
    proposal.outcome_summary = outcome_summary;
    proposal.impact_metrics = impact_metrics;
    await proposal.save();

    return proposal;
  }
}

module.exports = new WorkflowService();
