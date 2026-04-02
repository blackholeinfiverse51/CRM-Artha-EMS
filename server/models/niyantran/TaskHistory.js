const mongoose = require('mongoose');
const { applyAuditReplayFields } = require('./auditReplayPlugin');

const taskHistorySchema = new mongoose.Schema(
  {
    historyId: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
      match: [/^TH-[0-9]{8}-[0-9]{3,}$/, 'historyId must match TH-YYYYMMDD-XXX format'],
    },
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Candidate',
      required: true,
      index: true,
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'NiyantranTask',
      required: false,
      default: null,
      index: true,
    },
    fromState: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    toState: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    // Action labels are consumed by governance and explainability layers.
    action: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
      index: true,
    },
    reason: {
      type: String,
      default: null,
      trim: true,
      maxlength: 2000,
    },
    performed_at: {
      type: Date,
      required: true,
      default: () => new Date(),
      index: true,
    },
    // Flexible envelope for Sarathi PDP response, policy IDs, and replay hints.
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    collection: 'task_histories',
    strict: 'throw',
    minimize: false,
  }
);

applyAuditReplayFields(taskHistorySchema, { tracePrefix: 'trace' });

taskHistorySchema.pre('save', function appendOnlySave(next) {
  if (!this.isNew) {
    return next(new Error('TaskHistory is append-only and cannot be updated'));
  }

  return next();
});

function blockMutation(next) {
  next(new Error('TaskHistory is append-only. Updates and deletes are not allowed.'));
}

taskHistorySchema.pre('updateOne', blockMutation);
taskHistorySchema.pre('updateMany', blockMutation);
taskHistorySchema.pre('findOneAndUpdate', blockMutation);
taskHistorySchema.pre('replaceOne', blockMutation);
taskHistorySchema.pre('deleteOne', blockMutation);
taskHistorySchema.pre('deleteMany', blockMutation);
taskHistorySchema.pre('findOneAndDelete', blockMutation);
taskHistorySchema.pre('findOneAndReplace', blockMutation);

taskHistorySchema.index({ candidateId: 1, taskId: 1, performed_at: -1 });

module.exports = mongoose.model('TaskHistory', taskHistorySchema);
