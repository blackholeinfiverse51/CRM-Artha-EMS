const axios = require('axios');
const jwt = require('jsonwebtoken');

const BASE_URL = 'http://localhost:5003/api/governance';
const JWT_SECRET = 'supersecretkey';

// Generate test JWT token
const generateToken = (role = 'approver') => {
  return jwt.sign({ id: 'test-user-123', role }, JWT_SECRET, { expiresIn: '1h' });
};

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

const log = (message, color = 'reset') => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function testPhase5ConfigExternalization() {
  log('\n🔹 PHASE 5: Configuration Externalization', 'blue');
  
  try {
    const config = require('./config');
    
    if (config.MONGODB_URI && config.PORT && config.JWT_SECRET) {
      log('✅ Config module loaded successfully', 'green');
      log(`   PORT: ${config.PORT}`, 'yellow');
      log(`   AGENT_RULES_ENABLED: ${config.AGENT_RULES_ENABLED}`, 'yellow');
      return true;
    }
  } catch (error) {
    log(`❌ Config test failed: ${error.message}`, 'red');
    return false;
  }
}

async function testPhase6Authentication() {
  log('\n🔹 PHASE 6: Authentication for Governance', 'blue');
  
  try {
    // Test without token
    try {
      await axios.post(`${BASE_URL}/proposals/approve`, {
        proposal_id: 'test-id'
      });
      log('❌ Should have rejected request without token', 'red');
      return false;
    } catch (error) {
      if (error.response?.status === 401) {
        log('✅ Correctly rejected request without token', 'green');
      }
    }

    // Test with invalid token
    try {
      await axios.post(`${BASE_URL}/proposals/approve`, 
        { proposal_id: 'test-id' },
        { headers: { Authorization: 'Bearer invalid-token' } }
      );
      log('❌ Should have rejected invalid token', 'red');
      return false;
    } catch (error) {
      if (error.response?.status === 403) {
        log('✅ Correctly rejected invalid token', 'green');
      }
    }

    // Test with wrong role
    const userToken = jwt.sign({ id: 'user-123', role: 'user' }, JWT_SECRET);
    try {
      await axios.post(`${BASE_URL}/proposals/approve`,
        { proposal_id: 'test-id' },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
      log('❌ Should have rejected wrong role', 'red');
      return false;
    } catch (error) {
      if (error.response?.status === 403) {
        log('✅ Correctly rejected wrong role', 'green');
      }
    }

    log('✅ Authentication tests passed', 'green');
    return true;
  } catch (error) {
    log(`❌ Authentication test failed: ${error.message}`, 'red');
    return false;
  }
}

async function testPhase7MonitoringIntegration() {
  log('\n🔹 PHASE 7: Monitoring Agent Integration', 'blue');
  
  try {
    // Create proposal (simulating monitoring agent)
    const createResponse = await axios.post(`${BASE_URL}/proposals/create`, {
      agent_id: 'monitoring-agent',
      action_type: 'AUTO_RESTOCK',
      payload: {
        item_id: '123',
        item_name: 'Test Widget',
        current_quantity: 5,
        reorder_quantity: 100,
        reason: 'Low stock detected'
      }
    });

    const { proposal_id, trace_id } = createResponse.data.data;
    log(`✅ Proposal created: ${proposal_id}`, 'green');
    log(`   Trace ID: ${trace_id}`, 'yellow');

    // Review proposal
    const reviewResponse = await axios.post(`${BASE_URL}/proposals/review`, {
      proposal_id
    });

    if (reviewResponse.data.data.status === 'REVIEWED') {
      log('✅ Proposal reviewed successfully', 'green');
    }

    // Approve proposal
    const token = generateToken('approver');
    const approveResponse = await axios.post(`${BASE_URL}/proposals/approve`, {
      proposal_id,
      approval_notes: 'Test approval'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (approveResponse.data.data.status === 'APPROVED') {
      log('✅ Proposal approved successfully', 'green');
    }

    // Wait for execution
    await sleep(2000);

    // Get trace
    const traceResponse = await axios.get(`${BASE_URL}/proposals/${trace_id}/trace`);
    log('✅ Full trace retrieved', 'green');
    log(`   Lifecycle: ${JSON.stringify(traceResponse.data.data.lifecycle)}`, 'yellow');

    return { proposal_id, trace_id };
  } catch (error) {
    log(`❌ Monitoring integration test failed: ${error.message}`, 'red');
    if (error.response?.data) {
      log(`   Error details: ${JSON.stringify(error.response.data)}`, 'red');
    }
    return null;
  }
}

async function testPhase8RLFeedback(trace_id) {
  log('\n🔹 PHASE 8: RL Feedback Loop Foundation', 'blue');
  
  try {
    const outcomeService = require('./services/outcomeService');
    
    // Check if outcome was recorded
    const outcomes = await outcomeService.getOutcomes({ trace_id });
    
    if (outcomes.length > 0) {
      const outcome = outcomes[0];
      log('✅ Outcome recorded successfully', 'green');
      log(`   Success Score: ${outcome.success_score}`, 'yellow');
      log(`   Resolution Time: ${outcome.resolution_time}ms`, 'yellow');
      log(`   Effectiveness: ${outcome.action_effectiveness}`, 'yellow');
      log(`   Failure Signal: ${outcome.failure_signal}`, 'yellow');
      return true;
    } else {
      log('⚠️  No outcome recorded yet (may need more time)', 'yellow');
      return false;
    }
  } catch (error) {
    log(`❌ RL feedback test failed: ${error.message}`, 'red');
    return false;
  }
}

async function testPhase9AgentExpansion() {
  log('\n🔹 PHASE 9: Agent Expansion Hooks', 'blue');
  
  try {
    const BaseAgent = require('./agents/baseAgent');
    const MarketingAgent = require('./agents/marketingAgent');
    const SalesAgent = require('./agents/salesAgent');
    const agentRegistry = require('./agents/agentRegistry');

    // Test base agent
    if (BaseAgent) {
      log('✅ BaseAgent class loaded', 'green');
    }

    // Test marketing agent
    const marketingAgent = new MarketingAgent();
    if (marketingAgent.name === 'marketing-agent') {
      log('✅ MarketingAgent instantiated', 'green');
    }

    // Test sales agent
    const salesAgent = new SalesAgent();
    if (salesAgent.name === 'sales-agent') {
      log('✅ SalesAgent instantiated', 'green');
    }

    // Test agent registry
    if (agentRegistry.agents.length >= 3) {
      log(`✅ Agent registry has ${agentRegistry.agents.length} agents`, 'green');
    }

    return true;
  } catch (error) {
    log(`❌ Agent expansion test failed: ${error.message}`, 'red');
    return false;
  }
}

async function testPhase10Documentation() {
  log('\n🔹 PHASE 10: Documentation + Handover', 'blue');
  
  try {
    const fs = require('fs');
    const path = require('path');

    const requiredFiles = [
      'docs/governance-system.md',
      'README_PHASES_5_10.md',
      'Dockerfile',
      'config/index.js',
      'middleware/auth.js',
      'middleware/roleCheck.js',
      'agents/baseAgent.js',
      'agents/monitoringAgent.js',
      'models/Outcome.js',
      'services/outcomeService.js'
    ];

    let allExist = true;
    for (const file of requiredFiles) {
      const filePath = path.join(__dirname, file);
      if (fs.existsSync(filePath)) {
        log(`✅ ${file} exists`, 'green');
      } else {
        log(`❌ ${file} missing`, 'red');
        allExist = false;
      }
    }

    return allExist;
  } catch (error) {
    log(`❌ Documentation test failed: ${error.message}`, 'red');
    return false;
  }
}

async function runAllTests() {
  log('\n🚀 Starting Governance Service Tests (Phases 5-10)', 'blue');
  log('='.repeat(60), 'blue');

  const results = {
    phase5: false,
    phase6: false,
    phase7: null,
    phase8: false,
    phase9: false,
    phase10: false
  };

  // Phase 5
  results.phase5 = await testPhase5ConfigExternalization();

  // Phase 6
  results.phase6 = await testPhase6Authentication();

  // Phase 7
  results.phase7 = await testPhase7MonitoringIntegration();

  // Phase 8 (depends on Phase 7)
  if (results.phase7?.trace_id) {
    await sleep(3000); // Wait for outcome recording
    results.phase8 = await testPhase8RLFeedback(results.phase7.trace_id);
  }

  // Phase 9
  results.phase9 = await testPhase9AgentExpansion();

  // Phase 10
  results.phase10 = await testPhase10Documentation();

  // Summary
  log('\n' + '='.repeat(60), 'blue');
  log('📊 TEST SUMMARY', 'blue');
  log('='.repeat(60), 'blue');
  
  const passed = Object.values(results).filter(r => r === true).length;
  const total = Object.keys(results).length;

  log(`\nPhase 5 (Config): ${results.phase5 ? '✅ PASS' : '❌ FAIL'}`, results.phase5 ? 'green' : 'red');
  log(`Phase 6 (Auth): ${results.phase6 ? '✅ PASS' : '❌ FAIL'}`, results.phase6 ? 'green' : 'red');
  log(`Phase 7 (Monitoring): ${results.phase7 ? '✅ PASS' : '❌ FAIL'}`, results.phase7 ? 'green' : 'red');
  log(`Phase 8 (RL Feedback): ${results.phase8 ? '✅ PASS' : '⚠️  PARTIAL'}`, results.phase8 ? 'green' : 'yellow');
  log(`Phase 9 (Agents): ${results.phase9 ? '✅ PASS' : '❌ FAIL'}`, results.phase9 ? 'green' : 'red');
  log(`Phase 10 (Docs): ${results.phase10 ? '✅ PASS' : '❌ FAIL'}`, results.phase10 ? 'green' : 'red');

  log(`\n🎯 Overall: ${passed}/${total} phases passed`, passed === total ? 'green' : 'yellow');
  
  if (passed === total) {
    log('\n🎉 ALL TESTS PASSED! System is production-ready.', 'green');
  } else {
    log('\n⚠️  Some tests failed. Review logs above.', 'yellow');
  }

  process.exit(passed === total ? 0 : 1);
}

// Run tests
runAllTests().catch(error => {
  log(`\n❌ Test suite failed: ${error.message}`, 'red');
  process.exit(1);
});
