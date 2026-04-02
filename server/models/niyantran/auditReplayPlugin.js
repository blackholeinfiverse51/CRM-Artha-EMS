const { v4: uuidv4 } = require('uuid');

function nowUtc() {
  // JavaScript Date is stored in UTC in MongoDB.
  return new Date();
}

function generateTraceId(prefix = 'trace') {
  return `${prefix}_${uuidv4()}`;
}

function applyAuditReplayFields(schema, options = {}) {
  const performedByDefault = options.performedByDefault || 'system';
  const tracePrefix = options.tracePrefix || 'trace';

  schema.add({
    // trace_id enables cross-service correlation (Sarathi, bucket logs, replay pipelines).
    trace_id: {
      type: String,
      required: true,
      trim: true,
      index: true,
      default: () => generateTraceId(tracePrefix),
    },
    // version supports optimistic locking and deterministic replays.
    version: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    created_at: {
      type: Date,
      required: true,
      default: nowUtc,
      immutable: true,
    },
    updated_at: {
      type: Date,
      required: true,
      default: nowUtc,
    },
    // performed_by keeps actor attribution explicit (user, system, agent:mitra).
    performed_by: {
      type: String,
      required: true,
      trim: true,
      default: performedByDefault,
    },
  });

  schema.pre('validate', function preValidate(next) {
    if (!this.trace_id) {
      this.trace_id = generateTraceId(tracePrefix);
    }

    if (!this.created_at) {
      this.created_at = nowUtc();
    }

    if (!this.updated_at) {
      this.updated_at = this.created_at;
    }

    if (!this.performed_by) {
      this.performed_by = performedByDefault;
    }

    if (!this.version || this.version < 1) {
      this.version = 1;
    }

    next();
  });

  schema.pre('save', function preSave(next) {
    const now = nowUtc();

    if (this.isNew) {
      this.created_at = this.created_at || now;
      this.updated_at = this.updated_at || now;
    } else {
      this.updated_at = now;
      this.trace_id = generateTraceId(tracePrefix);
      this.version += 1;
    }

    if (!this.performed_by) {
      this.performed_by = performedByDefault;
    }

    next();
  });

  function prepareUpdate(next) {
    const update = this.getUpdate() || {};

    if (!update.$set) {
      update.$set = {};
    }

    if (!update.$inc) {
      update.$inc = {};
    }

    update.$set.updated_at = nowUtc();
    update.$set.trace_id = generateTraceId(tracePrefix);

    if (typeof update.$set.performed_by === 'undefined') {
      update.$set.performed_by = performedByDefault;
    }

    update.$inc.version = (update.$inc.version || 0) + 1;

    this.setUpdate(update);
    next();
  }

  schema.pre('findOneAndUpdate', prepareUpdate);
  schema.pre('updateOne', prepareUpdate);
  schema.pre('updateMany', prepareUpdate);
}

module.exports = {
  applyAuditReplayFields,
  generateTraceId,
};
