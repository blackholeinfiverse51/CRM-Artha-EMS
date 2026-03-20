const axios = require('axios');

const GOVERNANCE_URL = 'http://localhost:5003/api';
const WORKFLOW_URL = 'http://localhost:5001/api';

async function testPipeline() {
  console.log('🧪 Testing Approval → Execution → Traceability Pipeline\n');

  try {
    // Step 1: Create Proposal
    console.log('1️⃣ Creating proposal...');
    const createRes = await axios.post(`${GOVERNANCE_URL}/governance/proposals/create`, {
      agent_id: 'test-agent-001',
      action_type: 'salary_update',
      payload: {
        employee_id: 'emp-123',
        new_salary: 55000,
        reason: 'Performance bonus'
      }
    });
    const { proposal_id, trace_id } = createRes.data.data;
    console.log(`✅ Proposal created: ${proposal_id}`);
    console.log(`   Trace ID: ${trace_id}\n`);

    // Step 2: Review Proposal
    console.log('2️⃣ Reviewing proposal...');
    await axios.post(`${GOVERNANCE_URL}/governance/proposals/review`, {
      proposal_id
    });
    console.log('✅ Proposal reviewed\n');

    // Step 3: Approve Proposal (triggers execution)
    console.log('3️⃣ Approving proposal (auto-triggers execution)...');
    await axios.post(`${GOVERNANCE_URL}/governance/proposals/approve`, {
      proposal_id,
      approved_by: 'admin-user'
    });
    console.log('✅ Proposal approved\n');

    // Wait for execution
    console.log('⏳ Waiting for execution to complete...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 4: Get Full Trace
    console.log('4️⃣ Retrieving full trace...');
    const traceRes = await axios.get(`${GOVERNANCE_URL}/governance/proposals/${trace_id}/trace`);
    console.log('✅ Full trace retrieved:');
    console.log(JSON.stringify(traceRes.data.data, null, 2));
    console.log('\n');

    // Test Rejection Flow
    console.log('🔄 Testing rejection flow...\n');
    
    console.log('1️⃣ Creating second proposal...');
    const createRes2 = await axios.post(`${GOVERNANCE_URL}/governance/proposals/create`, {
      agent_id: 'test-agent-002',
      action_type: 'leave_approval',
      payload: {
        leave_id: 'leave-456',
        employee_id: 'emp-789'
      }
    });
    const { proposal_id: proposal_id2, trace_id: trace_id2 } = createRes2.data.data;
    console.log(`✅ Proposal created: ${proposal_id2}\n`);

    console.log('2️⃣ Reviewing proposal...');
    await axios.post(`${GOVERNANCE_URL}/governance/proposals/review`, {
      proposal_id: proposal_id2
    });
    console.log('✅ Proposal reviewed\n');

    console.log('3️⃣ Rejecting proposal...');
    await axios.post(`${GOVERNANCE_URL}/governance/proposals/reject`, {
      proposal_id: proposal_id2,
      rejection_reason: 'Insufficient documentation',
      rejected_by: 'admin-user'
    });
    console.log('✅ Proposal rejected (no execution triggered)\n');

    console.log('4️⃣ Retrieving rejection trace...');
    const traceRes2 = await axios.get(`${GOVERNANCE_URL}/governance/proposals/${trace_id2}/trace`);
    console.log('✅ Rejection trace:');
    console.log(JSON.stringify(traceRes2.data.data, null, 2));

    console.log('\n✅ All tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testPipeline();
