const test = require('node:test');
const assert = require('node:assert/strict');

const modelExports = require('../../models/niyantran');
const idempotencyService = require('../../services/niyantran/idempotencyService');

function makeQuery(record) {
  return {
    lean: async () => (record ? { ...record } : null),
  };
}

test('executeWithIdempotency returns replayed response when key already completed', async () => {
  const originalFindOne = modelExports.NiyantranIdempotencyKey.findOne;

  modelExports.NiyantranIdempotencyKey.findOne = () =>
    makeQuery({
      idempotencyKey: 'idem-1',
      action: 'submit_task',
      requestHash: idempotencyService.hashRequestPayload({ foo: 'bar' }),
      state: 'completed',
      statusCode: 200,
      responsePayload: { ok: true },
      trace_id: 'trace_existing',
    });

  const result = await idempotencyService.executeWithIdempotency({
    idempotencyKey: 'idem-1',
    action: 'submit_task',
    traceId: 'trace_new',
    requestPayload: { foo: 'bar' },
    handler: async () => ({
      statusCode: 200,
      responsePayload: { ok: false },
      trace_id: 'trace_new',
    }),
  });

  assert.equal(result.replayed, true);
  assert.equal(result.trace_id, 'trace_existing');
  assert.deepEqual(result.responsePayload, { ok: true });

  modelExports.NiyantranIdempotencyKey.findOne = originalFindOne;
});

test('executeWithIdempotency rejects same key with different payload', async () => {
  const originalFindOne = modelExports.NiyantranIdempotencyKey.findOne;

  modelExports.NiyantranIdempotencyKey.findOne = () =>
    makeQuery({
      idempotencyKey: 'idem-2',
      action: 'submit_task',
      requestHash: idempotencyService.hashRequestPayload({ foo: 'old' }),
      state: 'completed',
      statusCode: 200,
      responsePayload: { ok: true },
      trace_id: 'trace_existing',
    });

  await assert.rejects(
    () =>
      idempotencyService.executeWithIdempotency({
        idempotencyKey: 'idem-2',
        action: 'submit_task',
        traceId: 'trace_new',
        requestPayload: { foo: 'new' },
        handler: async () => ({
          statusCode: 200,
          responsePayload: { ok: false },
          trace_id: 'trace_new',
        }),
      }),
    /different payload/
  );

  modelExports.NiyantranIdempotencyKey.findOne = originalFindOne;
});

test('executeMutationWithOptionalIdempotency executes directly when key absent', async () => {
  const result = await idempotencyService.executeMutationWithOptionalIdempotency({
    idempotencyKey: null,
    action: 'assign_task',
    traceId: 'trace_direct',
    requestPayload: { foo: 'bar' },
    handler: async () => ({
      statusCode: 201,
      responsePayload: { created: true },
      trace_id: 'trace_direct',
    }),
  });

  assert.equal(result.replayed, false);
  assert.equal(result.statusCode, 201);
  assert.deepEqual(result.responsePayload, { created: true });
});

test('executeWithIdempotency stores and returns handler response on first call', async () => {
  const originalFindOne = modelExports.NiyantranIdempotencyKey.findOne;
  const originalCreate = modelExports.NiyantranIdempotencyKey.create;
  const originalUpdateOne = modelExports.NiyantranIdempotencyKey.updateOne;

  const store = new Map();

  modelExports.NiyantranIdempotencyKey.findOne = ({ idempotencyKey, action }) =>
    makeQuery(store.get(`${idempotencyKey}:${action}`));

  modelExports.NiyantranIdempotencyKey.create = async (doc) => {
    store.set(`${doc.idempotencyKey}:${doc.action}`, { ...doc });
    return doc;
  };

  modelExports.NiyantranIdempotencyKey.updateOne = async ({ idempotencyKey, action }, updateDoc) => {
    const key = `${idempotencyKey}:${action}`;
    const existing = store.get(key);
    if (!existing) {
      return { modifiedCount: 0 };
    }

    store.set(key, {
      ...existing,
      ...(updateDoc.$set || {}),
    });

    return { modifiedCount: 1 };
  };

  const result = await idempotencyService.executeWithIdempotency({
    idempotencyKey: 'idem-store',
    action: 'assign_task',
    traceId: 'trace_assign',
    requestPayload: { candidateId: '1' },
    handler: async () => ({
      statusCode: 201,
      responsePayload: { ok: true },
      trace_id: 'trace_assign',
    }),
  });

  assert.equal(result.replayed, false);
  assert.equal(result.statusCode, 201);
  assert.deepEqual(result.responsePayload, { ok: true });

  const stored = store.get('idem-store:assign_task');
  assert.equal(stored.state, 'completed');
  assert.equal(stored.trace_id, 'trace_assign');

  modelExports.NiyantranIdempotencyKey.findOne = originalFindOne;
  modelExports.NiyantranIdempotencyKey.create = originalCreate;
  modelExports.NiyantranIdempotencyKey.updateOne = originalUpdateOne;
});
