const axios = require('axios');
const { v2: cloudinary } = require('cloudinary');
const { generateTraceId } = require('../../models/niyantran/auditReplayPlugin');

let isCloudinaryConfigured = false;

function ensureCloudinaryConfigured() {
  if (isCloudinaryConfigured) {
    return;
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  isCloudinaryConfigured = true;
}

function resolveTraceId(incomingTraceId) {
  return incomingTraceId || generateTraceId('trace');
}

async function writeHistoryPayloadToBucket(candidateId, traceId, payload) {
  ensureCloudinaryConfigured();

  const jsonBody = JSON.stringify(payload, null, 2);
  const dataUri = `data:application/json;base64,${Buffer.from(jsonBody).toString('base64')}`;

  const result = await cloudinary.uploader.upload(dataUri, {
    resource_type: 'raw',
    public_id: `history/candidate-${candidateId}/${traceId}`,
    format: 'json',
    overwrite: false,
    use_filename: true,
    unique_filename: false,
    access_mode: 'private',
  });

  return result.secure_url;
}

async function pushToAgentHistory(traceId, action, payload) {
  const baseUrl = process.env.AGENT_HISTORY_SERVICE_URL || 'http://localhost:5003/api/agent/propose';

  const requestBody = {
    proposal_source: 'workflow-blackhole-niyantran',
    action_type: action,
    action_payload: payload,
    priority: 'high',
  };

  try {
    await axios.post(baseUrl, requestBody, {
      timeout: 5000,
      headers: {
        'X-Trace-ID': traceId,
      },
    });
  } catch (error) {
    const status = error.response ? error.response.status : 'NO_RESPONSE';
    throw new Error(`Failed to push action to agent-history-service (${status})`);
  }
}

async function logAction({
  candidateId,
  action,
  fromState,
  toState,
  performedBy,
  trace_id,
  metadata = {},
}) {
  const traceId = resolveTraceId(trace_id);

  const payload = {
    candidateId,
    action,
    fromState,
    toState,
    performedBy,
    trace_id: traceId,
    metadata,
    loggedAt: new Date().toISOString(),
  };

  await pushToAgentHistory(traceId, action, payload);
  const bucketLogUrl = await writeHistoryPayloadToBucket(candidateId, traceId, payload);

  return {
    trace_id: traceId,
    bucketLogUrl,
  };
}

module.exports = {
  logAction,
  resolveTraceId,
};
