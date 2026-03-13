const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

class TraceabilityDemo {
  constructor() {
    this.baseUrl = 'http://localhost:5003/api/agent';
    this.trace_id = uuidv4();
  }

  async runCompleteDemo() {
    console.log('🚀 Starting Traceability and Governance Demo');
    console.log(`📋 Demo Trace ID: ${this.trace_id}`);
    console.log('=' .repeat(60));

    try {
      // Step 1: AI Proposal
      await this.demoAIProposal();
      await this.sleep(2000);

      // Step 2: Human Approval
      await this.demoHumanApproval();
      await this.sleep(2000);

      // Step 3: Action Execution
      await this.demoActionExecution();
      await this.sleep(2000);

      // Step 4: Trace Retrieval
      await this.demoTraceRetrieval();
      await this.sleep(2000);

      // Step 5: Governance Validation
      await this.demoGovernanceValidation();
      await this.sleep(2000);

      // Step 6: Governance Rule Tests
      await this.demoGovernanceRules();

      console.log('✅ Traceability Demo Completed Successfully!');
    } catch (error) {
      console.error('❌ Demo failed:', error.message);
    }
  }

  async demoAIProposal() {
    console.log('\n📝 Step 1: AI Proposal Creation');
    console.log('-'.repeat(40));

    const proposalData = {
      proposal_id: `prop-demo-${Date.now()}`,
      proposal_source: 'demo_ai_agent',
      action_type: 'restock_inventory',
      action_payload: {
        product_id: 'DEMO-LAPTOP-001',
        current_stock: 2,
        reorder_level: 10,
        suggested_quantity: 30,
        supplier: 'DEMO-SUPPLIER-001',
        estimated_cost: 75000.00,
        urgency: 'medium'
      }
    };

    try {
      const response = await axios.post(`${this.baseUrl}/action-history`, proposalData, {
        headers: {
          'X-Trace-ID': this.trace_id,
          'User-Agent': 'demo-ai-agent/1.0'
        }
      });

      console.log('✅ AI Proposal Created');
      console.log(`   Trace ID: ${response.data.trace_id}`);
      console.log(`   Status: ${response.data.data.status}`);
      console.log(`   Governance: ${response.data.data.governance_status}`);
    } catch (error) {
      console.error('❌ AI Proposal Failed:', error.response?.data || error.message);
    }
  }

  async demoHumanApproval() {
    console.log('\n👤 Step 2: Human Approval');
    console.log('-'.repeat(40));

    const approvalData = {
      approval_status: 'approved',
      approval_identity: 'demo-manager-001'
    };

    try {
      const response = await axios.put(`${this.baseUrl}/action-history/${this.trace_id}/approval`, approvalData, {
        headers: {
          'X-Trace-ID': this.trace_id
        }
      });

      console.log('✅ Human Approval Completed');
      console.log(`   Trace ID: ${response.data.data.trace_id}`);
      console.log(`   Status: ${response.data.data.approval_status}`);
      console.log(`   Approved By: demo-manager-001`);
      console.log(`   Timestamp: ${response.data.data.timestamp_approved}`);
    } catch (error) {
      console.error('❌ Human Approval Failed:', error.response?.data || error.message);
    }
  }

  async demoActionExecution() {
    console.log('\n⚙️ Step 3: Action Execution');
    console.log('-'.repeat(40));

    const executionData = {
      execution_result: {
        purchase_order_created: true,
        po_number: `PO-DEMO-${Date.now()}`,
        supplier_notified: true,
        inventory_reserved: true,
        expected_delivery: '2025-01-25',
        total_cost: 75000.00,
        workflow_executor: 'demo-system-001'
      }
    };

    try {
      const response = await axios.post(`${this.baseUrl}/action-history/${this.trace_id}/execute`, executionData, {
        headers: {
          'X-Trace-ID': this.trace_id
        }
      });

      console.log('✅ Action Execution Completed');
      console.log(`   Trace ID: ${response.data.data.trace_id}`);
      console.log(`   Status: ${response.data.data.execution_status}`);
      console.log(`   Governance: ${response.data.data.governance_status}`);
      console.log(`   Recoverable: ${response.data.data.recoverable}`);
      console.log(`   Timestamp: ${response.data.data.timestamp_executed}`);
    } catch (error) {
      console.error('❌ Action Execution Failed:', error.response?.data || error.message);
    }
  }

  async demoTraceRetrieval() {
    console.log('\n🔍 Step 4: Complete Trace Retrieval');
    console.log('-'.repeat(40));

    try {
      const response = await axios.get(`${this.baseUrl}/trace/${this.trace_id}`, {
        headers: {
          'X-Trace-ID': this.trace_id
        }
      });

      const trace = response.data.data;
      console.log('✅ Complete Trace Retrieved');
      console.log(`   Trace ID: ${trace.trace_id}`);
      console.log(`   Proposal Source: ${trace.proposal.proposal_source}`);
      console.log(`   Action Type: ${trace.proposal.action_type}`);
      console.log(`   Approval Status: ${trace.approval.approval_status}`);
      console.log(`   Execution Status: ${trace.execution.execution_status}`);
      console.log(`   Total Duration: ${trace.audit_trail.total_duration_minutes} minutes`);
      
      console.log('\n📊 Governance Compliance:');
      console.log(`   AI Direct Execution: ${trace.governance.ai_direct_execution ? '❌' : '✅'}`);
      console.log(`   Approval Required: ${trace.governance.approval_required ? '✅' : '❌'}`);
      console.log(`   Execution Logged: ${trace.governance.execution_logged ? '✅' : '❌'}`);
      console.log(`   Recoverable: ${trace.governance.recoverable ? '✅' : '❌'}`);
    } catch (error) {
      console.error('❌ Trace Retrieval Failed:', error.response?.data || error.message);
    }
  }

  async demoGovernanceValidation() {
    console.log('\n🛡️ Step 5: Governance Validation');
    console.log('-'.repeat(40));

    try {
      const response = await axios.get(`${this.baseUrl}/governance/validate/${this.trace_id}`, {
        headers: {
          'X-Trace-ID': this.trace_id
        }
      });

      const governance = response.data.data;
      console.log('✅ Governance Validation Completed');
      console.log(`   Trace ID: ${governance.trace_id}`);
      console.log(`   Compliance Status: ${governance.compliance_status ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'}`);
      
      console.log('\n📋 Rule Compliance:');
      console.log(`   Rule 1 - AI Direct Execution: ${governance.governance_rules.ai_direct_execution ? '❌' : '✅'}`);
      console.log(`   Rule 2 - Approval Required: ${governance.governance_rules.approval_required ? '✅' : '❌'}`);
      console.log(`   Rule 3 - Execution Logged: ${governance.governance_rules.execution_logged ? '✅' : '❌'}`);
      console.log(`   Rule 4 - Recoverable: ${governance.governance_rules.recoverable ? '✅' : '❌'}`);
      
      console.log('\n📝 Audit Trail:');
      console.log(`   Proposal Logged: ${governance.audit_trail.proposal_logged ? '✅' : '❌'}`);
      console.log(`   Approval Logged: ${governance.audit_trail.approval_logged ? '✅' : '❌'}`);
      console.log(`   Execution Logged: ${governance.audit_trail.execution_logged ? '✅' : '❌'}`);
    } catch (error) {
      console.error('❌ Governance Validation Failed:', error.response?.data || error.message);
    }
  }

  async demoGovernanceRules() {
    console.log('\n🚫 Step 6: Governance Rule Testing');
    console.log('-'.repeat(40));

    // Test Rule 1: AI cannot execute directly
    console.log('\n🤖 Testing Rule 1: AI Direct Execution Prevention');
    try {
      await axios.post(`${this.baseUrl}/action-history`, {
        proposal_id: 'test-direct-exec',
        proposal_source: 'test_ai_agent',
        action_type: 'direct_execute_test',
        action_payload: { test: true }
      }, {
        headers: {
          'User-Agent': 'ai-agent/1.0'
        }
      });
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('✅ Rule 1 Enforced: AI direct execution blocked');
        console.log(`   Error: ${error.response.data.error}`);
        console.log(`   Rule: ${error.response.data.governance_rule}`);
      }
    }

    // Test Rule 2: Execution requires approval
    console.log('\n👤 Testing Rule 2: Approval Requirement');
    const testTraceId = uuidv4();
    
    // Create action without approval
    await axios.post(`${this.baseUrl}/action-history`, {
      proposal_id: 'test-no-approval',
      proposal_source: 'test_agent',
      action_type: 'test_action',
      action_payload: { test: true }
    }, {
      headers: {
        'X-Trace-ID': testTraceId
      }
    });

    // Try to execute without approval
    try {
      await axios.post(`${this.baseUrl}/action-history/${testTraceId}/execute`, {
        execution_result: { test: true }
      });
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('✅ Rule 2 Enforced: Execution blocked without approval');
        console.log(`   Error: ${error.response.data.error}`);
        console.log(`   Rule: ${error.response.data.governance_rule}`);
        console.log(`   Current Status: ${error.response.data.current_status}`);
      }
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run the demo
if (require.main === module) {
  const demo = new TraceabilityDemo();
  demo.runCompleteDemo().catch(console.error);
}

module.exports = TraceabilityDemo;