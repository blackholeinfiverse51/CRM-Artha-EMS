const mongoose = require('mongoose');
const { applyAuditReplayFields } = require('./auditReplayPlugin');

const TASK_STATUS = ['ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'REVIEWED', 'REJECTED'];

const TASK_TRANSITIONS = {
  ASSIGNED: ['IN_PROGRESS', 'SUBMITTED', 'REJECTED'],
  IN_PROGRESS: ['SUBMITTED', 'REJECTED'],
  SUBMITTED: ['REVIEWED', 'REJECTED'],
  REVIEWED: [],
  REJECTED: [],
};

const ACTIVE_TASK_STATES = ['ASSIGNED', 'IN_PROGRESS'];
const TERMINAL_TASK_STATES = ['SUBMITTED', 'REVIEWED', 'REJECTED'];

function isAllowedTransition(map, fromState, toState) {
  if (fromState === toState) {
    return true;
  }

  return Array.isArray(map[fromState]) && map[fromState].includes(toState);
}

const taskAttachmentSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const taskSubmissionSchema = new mongoose.Schema(
  {
    submissionType: {
      type: String,
      enum: ['file', 'link', 'text'],
      required: true,
    },
    content: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    fileUrls: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

const taskSchema = new mongoose.Schema(
  {
    // Human-readable business ID used across recruiter and audit workflows.
    taskId: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
      match: [/^TASK-[0-9]{8}-[0-9]{3,}$/, 'taskId must match TASK-YYYYMMDD-XXX format'],
    },
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Candidate',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    instructions: {
      type: String,
      required: true,
      trim: true,
      maxlength: 10000,
    },
    attachedFiles: {
      type: [taskAttachmentSchema],
      default: [],
    },
    status: {
      type: String,
      required: true,
      enum: TASK_STATUS,
      default: 'ASSIGNED',
      index: true,
    },
    assignedAt: {
      type: Date,
      required: true,
      default: () => new Date(),
    },
    dueDate: {
      type: Date,
      default: null,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    // Submission payload is schema-light to support future Mitra-triggered formats.
    submission: {
      type: taskSubmissionSchema,
      default: null,
    },
    // Only one task per candidate can be active; enforced with partial unique index.
    isActive: {
      type: Boolean,
      required: true,
      default: true,
      index: true,
    },
    assignedBy: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
  },
  {
    collection: 'tasks',
    strict: 'throw',
    minimize: false,
  }
);

applyAuditReplayFields(taskSchema, { tracePrefix: 'trace' });

taskSchema.path('submission').validate(function validateSubmission(value) {
  if (!['SUBMITTED', 'REVIEWED'].includes(this.status)) {
    return true;
  }

  if (!value || !value.submissionType) {
    return false;
  }

  const hasContent = value.content !== null && typeof value.content !== 'undefined';
  const hasFiles = Array.isArray(value.fileUrls) && value.fileUrls.length > 0;

  return hasContent || hasFiles;
}, 'submission is required with content or fileUrls for SUBMITTED/REVIEWED task');

taskSchema.pre('validate', function enforceTaskStateConsistency(next) {
  if (TERMINAL_TASK_STATES.includes(this.status)) {
    this.isActive = false;
  }

  if (this.isActive && !ACTIVE_TASK_STATES.includes(this.status)) {
    return next(new Error('isActive can only be true for ASSIGNED or IN_PROGRESS tasks'));
  }

  if (!this.isActive && ACTIVE_TASK_STATES.includes(this.status) && !this.submittedAt) {
    return next(new Error('Active task states must keep isActive=true until submission/review/rejection'));
  }

  if (this.submittedAt && this.assignedAt && this.submittedAt < this.assignedAt) {
    return next(new Error('submittedAt cannot be earlier than assignedAt'));
  }

  return next();
});

taskSchema.pre('save', async function enforceTaskTransition(next) {
  if (this.status === 'SUBMITTED' && !this.submittedAt) {
    this.submittedAt = new Date();
  }

  if (!this.isModified('status') || this.isNew) {
    return next();
  }

  try {
    const existing = await this.constructor.findById(this._id).select('status').lean();

    if (existing && !isAllowedTransition(TASK_TRANSITIONS, existing.status, this.status)) {
      return next(new Error(`Invalid task status transition: ${existing.status} -> ${this.status}`));
    }

    return next();
  } catch (error) {
    return next(error);
  }
});

taskSchema.index({ candidateId: 1, status: 1 });

// Enforces single active task per candidate at DB level.
taskSchema.index(
  { candidateId: 1, isActive: 1 },
  {
    unique: true,
    partialFilterExpression: { isActive: true },
    name: 'uniq_active_task_per_candidate',
  }
);

taskSchema.statics.TASK_STATUS = TASK_STATUS;
taskSchema.statics.TASK_TRANSITIONS = TASK_TRANSITIONS;

taskSchema.statics.ACTIVE_TASK_STATES = ACTIVE_TASK_STATES;

taskSchema.statics.TERMINAL_TASK_STATES = TERMINAL_TASK_STATES;

module.exports = mongoose.model('NiyantranTask', taskSchema);
