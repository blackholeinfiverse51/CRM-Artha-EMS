const crypto = require('crypto');
const { NiyantranIdempotencyKey } = require('../../models/niyantran');

function hashRequestPayload(payload) {
  return crypto.createHash('sha256').update(JSON.stringify(payload || {})).digest('hex');
}

async function executeWithIdempotency({
  idempotencyKey,
  action,
  candidateId = null,
  taskId = null,
  traceId,
  requestPayload,
  handler,
}) {
  if (!idempotencyKey) {
    const error = new Error('idempotencyKey is required');
    error.status = 400;
    throw error;
  }

  const requestHash = hashRequestPayload(requestPayload);

  async function resolveExisting(existingRecord) {
    if (existingRecord.requestHash !== requestHash) {
      const conflictError = new Error('Idempotency key reuse with different payload is not allowed');
      conflictError.status = 409;
      throw conflictError;
    }

    if (existingRecord.state === 'completed') {
      return {
        replayed: true,
        statusCode: existingRecord.statusCode || 200,
        responsePayload: existingRecord.responsePayload,
        trace_id: existingRecord.trace_id,
      };
    }

    if (existingRecord.state === 'pending') {
      const pendingError = new Error('Request with this idempotency key is already in progress');
      pendingError.status = 409;
      throw pendingError;
    }

    const failedError = new Error(existingRecord.errorMessage || 'Previous request with this idempotency key failed');
    failedError.status = 409;
    throw failedError;
  }

  let lockRecord = await NiyantranIdempotencyKey.findOne({ idempotencyKey, action }).lean();
  if (lockRecord) {
    return resolveExisting(lockRecord);
  }

  try {
    await NiyantranIdempotencyKey.create({
      idempotencyKey,
      action,
      candidateId,
      taskId,
      requestHash,
      state: 'pending',
      trace_id: traceId,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
  } catch (error) {
    if (error && error.code === 11000) {
      lockRecord = await NiyantranIdempotencyKey.findOne({ idempotencyKey, action }).lean();
      if (lockRecord) {
        return resolveExisting(lockRecord);
      }
    }
    throw error;
  }

  try {
    const result = await handler();

    await NiyantranIdempotencyKey.updateOne(
      { idempotencyKey, action },
      {
        $set: {
          state: 'completed',
          statusCode: result.statusCode || 200,
          responsePayload: result.responsePayload,
          trace_id: result.trace_id || traceId,
        },
      }
    );

    return {
      replayed: false,
      statusCode: result.statusCode || 200,
      responsePayload: result.responsePayload,
      trace_id: result.trace_id || traceId,
    };
  } catch (error) {
    await NiyantranIdempotencyKey.updateOne(
      { idempotencyKey, action },
      {
        $set: {
          state: 'failed',
          errorMessage: error.message,
        },
      }
    );

    throw error;
  }
}

module.exports = {
  executeWithIdempotency,
  hashRequestPayload,
};
