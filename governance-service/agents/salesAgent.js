const BaseAgent = require('./baseAgent');
const axios = require('axios');
const config = require('../config');

class SalesAgent extends BaseAgent {
  constructor() {
    super('sales-agent');
  }

  async execute() {
    const hotLeads = await this.findHotLeads();
    
    for (const lead of hotLeads) {
      await this.proposeAction('CREATE_OPPORTUNITY', {
        lead_id: lead.id,
        lead_name: lead.name,
        estimated_value: lead.estimated_value,
        priority: 'high',
        reason: 'High engagement score detected'
      });
    }
  }

  async findHotLeads() {
    try {
      const response = await axios.get(`${config.CRM_API_URL}/api/leads/hot`);
      return response.data.leads || [];
    } catch (error) {
      return [];
    }
  }
}

module.exports = SalesAgent;
