const axios = require('axios');

async function run() {
  const baseUrl = process.env.BASE_URL || 'http://localhost:5001';
  const token = process.env.AUTH_TOKEN;
  const taskId = process.env.TASK_ID;
  const candidateId = process.env.CANDIDATE_ID;
  const idempotencyKey = process.env.IDEMPOTENCY_KEY || '11111111-1111-1111-1111-111111111111';

  if (!token || !taskId || !candidateId) {
    throw new Error('AUTH_TOKEN, TASK_ID, and CANDIDATE_ID env vars are required');
  }

  const url = `${baseUrl}/api/niyantran/tasks/submit`;
  const headers = {
    'x-auth-token': token,
    'x-idempotency-key': idempotencyKey,
    'Content-Type': 'application/json',
  };

  const payload = {
    taskId,
    candidateId,
    submissionType: 'text',
    content: 'Phase 10 replay-safe submission demo',
    fileUrls: [],
  };

  const first = await axios.post(url, payload, { headers });
  const second = await axios.post(url, payload, { headers });

  console.log('First response replayed:', Boolean(first.data.replayed));
  console.log('Second response replayed:', Boolean(second.data.replayed));
  console.log('Second response trace_id:', second.data.trace_id);
}

run().catch((error) => {
  const message = error.response ? JSON.stringify(error.response.data) : error.message;
  console.error('Idempotency replay demo failed:', message);
  process.exit(1);
});
