const BaseAgent = require('./baseAgent');
const axios = require('axios');
const config = require('../config');

class MarketingAgent extends BaseAgent {
  constructor() {
    super('marketing-agent');
  }

  async execute() {
    const inactiveCustomers = await this.findInactiveCustomers();
    
    for (const customer of inactiveCustomers) {
      await this.proposeAction('SEND_ENGAGEMENT_EMAIL', {
        customer_id: customer.id,
        customer_email: customer.email,
        campaign_type: 'reengagement',
        reason: 'Customer inactive for 30+ days'
      });
    }
  }

  async findInactiveCustomers() {
    try {
      const response = await axios.get(`${config.CRM_API_URL}/api/customers/inactive`);
      return response.data.customers || [];
    } catch (error) {
      return [];
    }
  }
}

module.exports = MarketingAgent;
