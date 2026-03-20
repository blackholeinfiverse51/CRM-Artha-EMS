const ActionHistory = require('../models/ActionHistory');
const Proposal = require('../models/Proposal');
const axios = require('axios');

class ActionHistoryController {
  async updateApproval(req, res) {
    try {
      const { trace_id } = req.params;
      const { approval_status, approved_by, approval_timestamp } = req.body;

      const history = await ActionHistory.findOne({ trace_id });
      if (!history) {
        return res.status(404).json({ success: false, error: 'Action not found' });
      }

      if (history.approval_status !== 'pending') {
        return res.status(400).json({ success: false, error: 'Action already processed' });
      }

      history.approval_status = approval_status;
      history.approved_by = approved_by;
      history.approval_timestamp = approval_timestamp || new Date();
      await history.save();

      console.log(JSON.stringify({
        trace_id,
        stage: 'approval_decision',
        approval_status,
        approved_by,
        timestamp: new Date().toISOString()
      }));

      if (approval_status === 'approved') {
        setImmediate(async () => {
          try {
            await axios.post('http://localhost:5001/api/workflow/execute', {
              trace_id: history.trace_id,
              action_type: history.action_type,
              employee_id: history.action_payload.employee_id,
              action_payload: history.action_payload
            }, {
              headers: { 'X-Trace-ID': trace_id }
            });

            console.log(JSON.stringify({
              trace_id,
              stage: 'approval_trigger',
              status: 'execution_triggered',
              timestamp: new Date().toISOString()
            }));
          } catch (error) {
            console.error(JSON.stringify({
              trace_id,
              stage: 'approval_trigger',
              status: 'failure',
              error: error.message,
              timestamp: new Date().toISOString()
            }));
          }
        });
      }

      res.json({ success: true, data: history });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async updateExecution(req, res) {
    try {
      const { trace_id } = req.params;
      const { execution_status, execution_timestamp, result_payload, failure_reason } = req.body;

      const history = await ActionHistory.findOne({ trace_id });
      if (!history) {
        return res.status(404).json({ success: false, error: 'Action not found' });
      }

      history.execution_status = execution_status;
      history.execution_timestamp = execution_timestamp || new Date();
      history.result_payload = result_payload;
      history.failure_reason = failure_reason;
      await history.save();

      console.log(JSON.stringify({
        trace_id,
        proposal_id: history.proposal_id,
        approval_by: history.approved_by,
        execution_status,
        timestamp: new Date().toISOString(),
        service: 'history_service'
      }));

      res.json({ success: true, data: history });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async getTrace(req, res) {
    try {
      const { trace_id } = req.params;
      const history = await ActionHistory.findOne({ trace_id });
      
      if (!history) {
        return res.status(404).json({ success: false, error: 'Trace not found' });
      }

      res.json({ success: true, data: history });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
}

module.exports = new ActionHistoryController();
