const axios = require('axios');

const GOVERNANCE_URL = 'http://localhost:5003/api';

async function waitForService(url, name, maxRetries = 10) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await axios.get(url);
      console.log(`✅ ${name} is ready\n`);
      return true;
    } catch (error) {
      console.log(`⏳ Waiting for ${name}... (${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  throw new Error(`${name} not available after ${maxRetries} retries`);
}

async function testGovernanceOnly() {
  console.log('🧪 Testing Governance Service (Proposal Lifecycle)\n');

  try {
    // Wait for service
    console.log('🔍 Checking service availability...\n');
    await waitForService('http://localhost:5003/health', 'Governance Service');
    
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
    const { proposal_id, trace_id, status } = createRes.data.data;
    console.log(`✅ Proposal created`);
    console.log(`   Proposal ID: ${proposal_id}`);
    console.log(`   Trace ID: ${trace_id}`);
    console.log(`   Status: ${status}\n`);

    // Step 2: Review Proposal
    console.log('2️⃣ Reviewing proposal...');
    const reviewRes = await axios.post(`${GOVERNANCE_URL}/governance/proposals/review`, {
      proposal_id
    });
    console.log(`✅ Proposal reviewed`);
    console.log(`   Status: ${reviewRes.data.data.status}\n`);

    // Step 3: Approve Proposal
    console.log('3️⃣ Approving proposal...');
    const approveRes = await axios.post(`${GOVERNANCE_URL}/governance/proposals/approve`, {
      proposal_id,
      approved_by: 'admin-user'
    });
    console.log(`✅ Proposal approved`);
    console.log(`   Status: ${approveRes.data.data.status}`);
    console.log(`   Approved by: ${approveRes.data.data.approved_by}\n`);

    // Step 4: Get Full Trace
    console.log('4️⃣ Retrieving full trace...');
    const traceRes = await axios.get(`${GOVERNANCE_URL}/governance/proposals/${trace_id}/trace`);
    console.log('✅ Full trace retrieved:\n');
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
    const rejectRes = await axios.post(`${GOVERNANCE_URL}/governance/proposals/reject`, {
      proposal_id: proposal_id2,
      rejection_reason: 'Insufficient documentation',
      rejected_by: 'admin-user'
    });
    console.log(`✅ Proposal rejected`);
    console.log(`   Status: ${rejectRes.data.data.status}`);
    console.log(`   Reason: ${rejectRes.data.data.rejection_reason}\n`);

    console.log('4️⃣ Retrieving rejection trace...');
    const traceRes2 = await axios.get(`${GOVERNANCE_URL}/governance/proposals/${trace_id2}/trace`);
    console.log('✅ Rejection trace:\n');
    console.log(JSON.stringify(traceRes2.data.data, null, 2));

    console.log('\n✅ All governance tests passed!');
    console.log('\n📝 Note: Workflow execution requires workflow service to be running');
    console.log('   Start it with: cd workflow-blackhole/server && npm start');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Make sure governance service is running:');
      console.error('   cd governance-service && npm start');
    }
  }
}

testGovernanceOnly();
