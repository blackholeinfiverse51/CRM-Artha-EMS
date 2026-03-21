const axios = require('axios');
const config = require('../config');

class BaseAgent {
  constructor(name) {
    this.name = name;
  }

  async proposeAction(action_type, payload) {
    const { v4: uuidv4 } = require('uuid');
    const trace_id = uuidv4();

    const proposal = {
      trace_id,
      agent_id: this.name,
      action_type,
      payload
    };

    try {
      const response = await axios.post(
        `${config.API_BASE_URL}/api/governance/proposals/create`,
        proposal
      );
      console.log(`✅ [${this.name}] Proposal created: ${response.data.data.proposal_id}`);
      return response.data;
    } catch (error) {
      console.error(`❌ [${this.name}] Failed to create proposal: ${error.message}`);
      throw error;
    }
  }

  async execute() {
    throw new Error(`${this.name}: execute() must be implemented`);
  }
}

module.exports = BaseAgent;
