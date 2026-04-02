const mongoose = require('mongoose');

const idempotencyKeySchema = new mongoose.Schema(
  {
    idempotencyKey: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    action: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Candidate',
      default: null,
      index: true,
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'NiyantranTask',
      default: null,
      index: true,
    },
    requestHash: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    state: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    statusCode: {
      type: Number,
      default: null,
    },
    responsePayload: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    errorMessage: {
      type: String,
      default: null,
      maxlength: 2000,
    },
    trace_id: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    collection: 'niyantran_idempotency_keys',
    strict: 'throw',
    minimize: false,
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  }
);

idempotencyKeySchema.index(
  { idempotencyKey: 1, action: 1 },
  { unique: true, name: 'uniq_idempotency_action' }
);

idempotencyKeySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('NiyantranIdempotencyKey', idempotencyKeySchema);
