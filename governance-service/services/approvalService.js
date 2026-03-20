const Proposal = require('../models/Proposal');
const workflowService = require('./workflowService');

const autoApprovalRules = {
  'CREATE_LEAD': true,
  'UPDATE_INVENTORY': (payload) => payload.quantity < 100,
  'CREATE_EXPENSE': (payload) => payload.amount < 10000
};

class ApprovalService {
  async approveProposal(proposal_id, approved_by = 'system') {
    const proposal = await Proposal.findOne({ proposal_id });
    if (!proposal || proposal.status !== 'REVIEWED') {
      throw new Error('Proposal must be reviewed first');
    }

    proposal.status = 'APPROVED';
    proposal.approved_by = approved_by;
    proposal.approval_timestamp = new Date();
    await proposal.save();

    console.log(JSON.stringify({
      trace_id: proposal.trace_id,
      stage: 'approval_trigger',
      status: 'approved',
      timestamp: new Date().toISOString()
    }));

    setImmediate(async () => {
      try {
        await workflowService.executeProposal(proposal_id);
        console.log(JSON.stringify({
          trace_id: proposal.trace_id,
          stage: 'approval_trigger',
          status: 'execution_triggered',
          timestamp: new Date().toISOString()
        }));
      } catch (error) {
        console.error(JSON.stringify({
          trace_id: proposal.trace_id,
          stage: 'approval_trigger',
          status: 'execution_failed',
          error: error.message,
          timestamp: new Date().toISOString()
        }));
      }
    });

    return proposal;
  }

  async rejectProposal(proposal_id, rejection_reason, rejected_by = 'system') {
    const proposal = await Proposal.findOne({ proposal_id });
    if (!proposal || proposal.status !== 'REVIEWED') {
      throw new Error('Proposal must be reviewed first');
    }

    proposal.status = 'REJECTED';
    proposal.rejection_reason = rejection_reason;
    proposal.approved_by = rejected_by;
    await proposal.save();

    return proposal;
  }

  async autoApprove(proposal_id) {
    const proposal = await Proposal.findOne({ proposal_id });
    const rule = autoApprovalRules[proposal.action_type];
    
    if (rule === true || (typeof rule === 'function' && rule(proposal.payload))) {
      return this.approveProposal(proposal_id, 'auto-system');
    }
    
    return null;
  }
}

module.exports = new ApprovalService();
