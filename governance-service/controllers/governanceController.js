const Proposal = require('../models/Proposal');
const validationService = require('../services/validationService');
const approvalService = require('../services/approvalService');
const workflowService = require('../services/workflowService');

class GovernanceController {
  async createProposal(req, res) {
    try {
      const { agent_id, action_type, payload } = req.body;
      
      const proposal = new Proposal({ agent_id, action_type, payload });
      await proposal.save();

      res.status(201).json({
        success: true,
        data: {
          proposal_id: proposal.proposal_id,
          trace_id: proposal.trace_id,
          status: proposal.status
        }
      });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async reviewProposal(req, res) {
    try {
      const { proposal_id } = req.body;
      const { valid, proposal } = await validationService.reviewProposal(proposal_id);

      res.json({
        success: true,
        data: {
          proposal_id: proposal.proposal_id,
          trace_id: proposal.trace_id,
          status: proposal.status,
          valid,
          review_notes: proposal.review_notes
        }
      });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async approveProposal(req, res) {
    try {
      const { proposal_id, approval_notes } = req.body;
      const approved_by = req.user?.id || req.body.approved_by;
      const proposal = await approvalService.approveProposal(proposal_id, approved_by, approval_notes);

      res.json({
        success: true,
        data: {
          proposal_id: proposal.proposal_id,
          trace_id: proposal.trace_id,
          status: proposal.status,
          approved_by: proposal.approved_by,
          approval_timestamp: proposal.approval_timestamp
        }
      });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async rejectProposal(req, res) {
    try {
      const { proposal_id, rejection_reason, rejection_notes } = req.body;
      const rejected_by = req.user?.id || req.body.rejected_by;
      const proposal = await approvalService.rejectProposal(proposal_id, rejection_reason, rejected_by, rejection_notes);

      res.json({
        success: true,
        data: {
          proposal_id: proposal.proposal_id,
          trace_id: proposal.trace_id,
          status: proposal.status,
          rejection_reason: proposal.rejection_reason
        }
      });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async executeWorkflow(req, res) {
    try {
      const { proposal_id } = req.body;
      const { execution_id, result, proposal } = await workflowService.executeProposal(proposal_id);

      res.json({
        success: true,
        data: {
          proposal_id: proposal.proposal_id,
          trace_id: proposal.trace_id,
          execution_id,
          status: proposal.status,
          execution_status: proposal.execution_status
        }
      });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async getTrace(req, res) {
    try {
      const { id } = req.params;
      const proposal = await Proposal.findOne({
        $or: [{ proposal_id: id }, { trace_id: id }]
      });

      if (!proposal) {
        return res.status(404).json({ success: false, error: 'Proposal not found' });
      }

      res.json({
        success: true,
        data: {
          proposal_id: proposal.proposal_id,
          trace_id: proposal.trace_id,
          agent_id: proposal.agent_id,
          action_type: proposal.action_type,
          status: proposal.status,
          lifecycle: {
            created_at: proposal.created_at,
            reviewed: proposal.status !== 'CREATED',
            approved: ['APPROVED', 'EXECUTED', 'COMPLETED'].includes(proposal.status),
            executed: ['EXECUTED', 'COMPLETED'].includes(proposal.status),
            completed: proposal.status === 'COMPLETED'
          },
          execution_logs: proposal.execution_logs,
          outcome_summary: proposal.outcome_summary
        }
      });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
}

module.exports = new GovernanceController();
