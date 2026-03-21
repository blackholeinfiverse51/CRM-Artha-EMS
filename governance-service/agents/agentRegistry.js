const MonitoringAgent = require('./monitoringAgent');
const MarketingAgent = require('./marketingAgent');
const SalesAgent = require('./salesAgent');

class AgentRegistry {
  constructor() {
    this.agents = [
      MonitoringAgent,
      new MarketingAgent(),
      new SalesAgent()
    ];
  }

  startAll() {
    this.agents.forEach(agent => {
      if (agent.start) {
        agent.start();
      }
    });
    console.log(`✅ Started ${this.agents.length} agents`);
  }

  stopAll() {
    this.agents.forEach(agent => {
      if (agent.stop) {
        agent.stop();
      }
    });
    console.log('🛑 All agents stopped');
  }

  getAgent(name) {
    return this.agents.find(agent => agent.name === name);
  }
}

module.exports = new AgentRegistry();
