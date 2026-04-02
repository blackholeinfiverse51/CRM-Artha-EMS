const mongoose = require('mongoose');
const { applyAuditReplayFields } = require('./auditReplayPlugin');

const NDA_STATUS = ['pending', 'signed', 'submitted', 'rejected'];

const NDA_TRANSITIONS = {
  pending: ['signed', 'rejected'],
  signed: ['submitted', 'rejected'],
  submitted: [],
  rejected: [],
};

function isAllowedTransition(map, fromState, toState) {
  if (fromState === toState) {
    return true;
  }

  return Array.isArray(map[fromState]) && map[fromState].includes(toState);
}

const signatureMetadataSchema = new mongoose.Schema(
  {
    signatureHash: {
      type: String,
      trim: true,
    },
    timestamp: {
      type: Date,
    },
    ip: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    userAgent: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  { _id: false }
);

const ndaSchema = new mongoose.Schema(
  {
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Candidate',
      required: true,
      index: true,
    },
    // Human-readable NDA ID for legal/compliance references.
    ndaId: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
      match: [/^NDA-[0-9]{8}-[0-9]{3,}$/, 'ndaId must match NDA-YYYYMMDD-XXX format'],
    },
    status: {
      type: String,
      required: true,
      enum: NDA_STATUS,
      default: 'pending',
      index: true,
    },
    // Bucket path used for immutable legal evidence retrieval.
    fileUrl: {
      type: String,
      trim: true,
      default: null,
    },
    signedAt: {
      type: Date,
      default: null,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    signedBy: {
      type: String,
      trim: true,
      default: null,
    },
    // Signature proof required for forensic and compliance verification.
    signatureMetadata: {
      type: signatureMetadataSchema,
      default: {},
    },
  },
  {
    collection: 'ndas',
    strict: 'throw',
    minimize: false,
  }
);

applyAuditReplayFields(ndaSchema, { tracePrefix: 'trace' });

ndaSchema.path('fileUrl').validate(function validateFileUrl(value) {
  if (this.status !== 'submitted') {
    return true;
  }

  return Boolean(value);
}, 'fileUrl is required when NDA is submitted');

ndaSchema.path('signatureMetadata').validate(function validateSignatureMetadata(value) {
  if (this.status !== 'signed' && this.status !== 'submitted') {
    return true;
  }

  return Boolean(value && value.signatureHash && value.timestamp);
}, 'signatureMetadata.signatureHash and signatureMetadata.timestamp are required for signed/submitted NDA');

ndaSchema.pre('save', async function enforceNdaRules(next) {
  if (this.status === 'signed' && !this.signedAt) {
    this.signedAt = new Date();
  }

  if (this.status === 'submitted' && !this.submittedAt) {
    this.submittedAt = new Date();
  }

  if (!this.isNew) {
    try {
      const existing = await this.constructor
        .findById(this._id)
        .select('status submittedAt')
        .lean();

      if (existing && existing.status === 'submitted') {
        return next(new Error('NDA is immutable after submitted status'));
      }

      if (
        existing &&
        this.isModified('status') &&
        !isAllowedTransition(NDA_TRANSITIONS, existing.status, this.status)
      ) {
        return next(new Error(`Invalid NDA status transition: ${existing.status} -> ${this.status}`));
      }
    } catch (error) {
      return next(error);
    }
  }

  if (this.submittedAt && this.signedAt && this.submittedAt < this.signedAt) {
    return next(new Error('submittedAt cannot be earlier than signedAt'));
  }

  return next();
});

ndaSchema.index({ candidateId: 1, status: 1 });

ndaSchema.statics.NDA_STATUS = NDA_STATUS;
ndaSchema.statics.NDA_TRANSITIONS = NDA_TRANSITIONS;

module.exports = mongoose.model('NiyantranNDA', ndaSchema);
