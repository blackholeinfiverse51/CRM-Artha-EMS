const mongoose = require('mongoose');
const { applyAuditReplayFields } = require('./auditReplayPlugin');

const CANDIDATE_STATUS = [
  'APPLIED',
  'SHORTLISTED',
  'NDA_PENDING',
  'NDA_SUBMITTED',
  'TASK_ASSIGNED',
  'IN_PROGRESS',
  'SUBMITTED',
  'REVIEWED',
  'REJECTED',
  'HIRED',
];

const NDA_STATUS = ['pending', 'signed', 'submitted', 'rejected'];

const CANDIDATE_TRANSITIONS = {
  APPLIED: ['SHORTLISTED'],
  SHORTLISTED: ['NDA_PENDING'],
  NDA_PENDING: ['NDA_SUBMITTED'],
  NDA_SUBMITTED: ['TASK_ASSIGNED'],
  TASK_ASSIGNED: ['IN_PROGRESS'],
  IN_PROGRESS: ['SUBMITTED'],
  SUBMITTED: ['REVIEWED'],
  REVIEWED: ['HIRED', 'REJECTED'],
  REJECTED: [],
  HIRED: [],
};

function isAllowedTransition(map, fromState, toState) {
  if (fromState === toState) {
    // Idempotent replay writes should not fail.
    return true;
  }

  return Array.isArray(map[fromState]) && map[fromState].includes(toState);
}

const candidateSchema = new mongoose.Schema(
  {
    // Human-readable immutable ID used in business workflows and audit narratives.
    candidateId: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
      match: [/^CAND-[0-9]{8}-[0-9]{3,}$/, 'candidateId must match CAND-YYYYMMDD-XXX format'],
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
      match: [/^\S+@\S+\.\S+$/, 'email must be valid'],
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30,
    },
    role: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    // Primary lifecycle state used by deterministic transition logic.
    status: {
      type: String,
      required: true,
      enum: CANDIDATE_STATUS,
      default: 'APPLIED',
      index: true,
    },
    // Pointer to the only active task, kept in sync by workflow transitions.
    currentTaskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'NiyantranTask',
      default: null,
      index: true,
    },
    ndaStatus: {
      type: String,
      required: true,
      enum: NDA_STATUS,
      default: 'pending',
      index: true,
    },
    ndaDocumentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'NiyantranNDA',
      default: null,
      index: true,
    },
    // Open context for Sarathi PDP context and downstream agent metadata.
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // Timeline anchor for governance reviews and SLA checks.
    lastStateChangeAt: {
      type: Date,
      required: true,
      default: () => new Date(),
    },
  },
  {
    collection: 'candidates',
    strict: 'throw',
    minimize: false,
  }
);

applyAuditReplayFields(candidateSchema, { tracePrefix: 'trace' });

candidateSchema.path('currentTaskId').validate(function validateCurrentTaskId(value) {
  if (!value) {
    return true;
  }

  return ['TASK_ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'REVIEWED'].includes(this.status);
}, 'currentTaskId can only be set when candidate is in task-related states');

candidateSchema.path('ndaDocumentId').validate(function validateNdaDocumentId(value) {
  if (!value) {
    return true;
  }

  return this.ndaStatus === 'submitted' || this.ndaStatus === 'signed';
}, 'ndaDocumentId requires ndaStatus to be signed or submitted');

candidateSchema.pre('save', async function enforceStateTransition(next) {
  if (!this.isModified('status')) {
    return next();
  }

  this.lastStateChangeAt = new Date();

  if (this.isNew) {
    return next();
  }

  try {
    const existing = await this.constructor.findById(this._id).select('status').lean();

    if (existing && !isAllowedTransition(CANDIDATE_TRANSITIONS, existing.status, this.status)) {
      return next(
        new Error(`Invalid candidate status transition: ${existing.status} -> ${this.status}`)
      );
    }

    return next();
  } catch (error) {
    return next(error);
  }
});

candidateSchema.statics.CANDIDATE_STATUS = CANDIDATE_STATUS;
candidateSchema.statics.CANDIDATE_TRANSITIONS = CANDIDATE_TRANSITIONS;

module.exports = mongoose.model('Candidate', candidateSchema);
