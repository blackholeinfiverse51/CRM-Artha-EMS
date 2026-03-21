const axios = require('axios');
const config = require('../config');

class MonitoringAgent {
  constructor() {
    this.name = 'monitoring-agent';
    this.interval = null;
  }

  start() {
    console.log(`🔍 Monitoring Agent started (interval: ${config.MONITOR_INTERVAL_MS}ms)`);
    this.interval = setInterval(() => this.checkAnomalies(), config.MONITOR_INTERVAL_MS);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      console.log('🛑 Monitoring Agent stopped');
    }
  }

  async checkAnomalies() {
    try {
      const inventoryData = await this.fetchInventoryData();
      
      for (const item of inventoryData) {
        if (item.quantity < item.reorder_level) {
          await this.proposeRestock(item);
        }
      }
    } catch (error) {
      console.error('Monitoring error:', error.message);
    }
  }

  async fetchInventoryData() {
    try {
      const response = await axios.get(`${config.CRM_API_URL}/inventory`);
      return response.data.items || [];
    } catch (error) {
      return [];
    }
  }

  async proposeRestock(item) {
    const { v4: uuidv4 } = require('uuid');
    const trace_id = uuidv4();

    const proposal = {
      trace_id,
      agent_id: this.name,
      action_type: 'AUTO_RESTOCK',
      payload: {
        item_id: item.id,
        item_name: item.name,
        current_quantity: item.quantity,
        reorder_quantity: item.reorder_quantity || 100,
        reason: 'Low stock detected'
      }
    };

    try {
      const response = await axios.post(
        `${config.API_BASE_URL}/api/governance/proposals/create`,
        proposal
      );
      console.log(`✅ Proposal created: ${response.data.data.proposal_id}`);
    } catch (error) {
      console.error(`❌ Failed to create proposal: ${error.message}`);
    }
  }
}

module.exports = new MonitoringAgent();
