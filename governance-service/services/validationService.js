const Proposal = require('../models/Proposal');

const businessRules = {
  'CREATE_EMPLOYEE': (payload) => payload.name && payload.email,
  'UPDATE_INVENTORY': (payload) => payload.item_id && payload.quantity >= 0,
  'PROCESS_ORDER': (payload) => payload.order_id && payload.amount > 0,
  'CREATE_EXPENSE': (payload) => payload.amount > 0 && payload.category,
  'CREATE_LEAD': (payload) => payload.name && payload.contact
};

class ValidationService {
  async reviewProposal(proposal_id) {
    const proposal = await Proposal.findOne({ proposal_id });
    if (!proposal || proposal.status !== 'CREATED') {
      throw new Error('Invalid proposal or status');
    }

    const rule = businessRules[proposal.action_type];
    const isValid = rule ? rule(proposal.payload) : false;

    proposal.status = 'REVIEWED';
    proposal.review_notes = isValid ? 'Passed validation' : 'Failed business rules';
    proposal.reviewer_type = 'system';
    await proposal.save();

    return { valid: isValid, proposal };
  }
}

module.exports = new ValidationService();
