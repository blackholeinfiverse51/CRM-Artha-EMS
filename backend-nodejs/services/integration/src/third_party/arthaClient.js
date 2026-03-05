const axios = require('axios');

const baseURL = process.env.ARTHA_BASE_URL || 'http://localhost:5500/api';
const apiKey = process.env.ARTHA_API_KEY || 'dev_key';

function headers(trace_id, idempotencyKey) {
  const h = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  };
  if (trace_id) h['X-Trace-Id'] = trace_id;
  if (idempotencyKey) h['Idempotency-Key'] = idempotencyKey;
  return h;
}

async function backoffAttempt(fn, { max = 5, base = 200 } = {}) {
  let attempt = 0;
  let lastErr;
  while (attempt < max) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const status = err?.response?.status;
      // Retry on 429/5xx and network errors
      if (status && status < 500 && status !== 429) break;
      const delay = Math.min(5000, base * Math.pow(2, attempt));
      await new Promise(r => setTimeout(r, delay));
      attempt += 1;
    }
  }
  throw lastErr;
}

exports.arthaClient = {
  async upsertEmployee(payload, trace_id) {
    const url = `${baseURL}/employees/upsert`;
    const idempotencyKey = `emp-${payload.external_id}`;
    const res = await backoffAttempt(() => axios.post(url, payload, { headers: headers(trace_id, idempotencyKey), timeout: 10000 }));
    return res.data;
  },

  async postLedgerEntry(payload, trace_id, invoiceNumber) {
    const url = `${baseURL}/ledger/entries`;
    const idempotencyKey = `inv-${invoiceNumber}`;
    const res = await backoffAttempt(() => axios.post(url, payload, { headers: headers(trace_id, idempotencyKey), timeout: 10000 }));
    return res.data;
  },
};
