const mongoose = require('mongoose');
const {
  Candidate,
  NiyantranTask,
  TaskHistory,
} = require('../../models/niyantran');
const governanceService = require('./governanceService');
const { resolveTraceId, logAction, logFailure } = require('./auditService');
const { transitionCandidate } = require('./transitionService');
const { executeMutationWithOptionalIdempotency } = require('./idempotencyService');
const notificationService = require('./notificationService');
const {
  InvalidStateTransitionError,
  GovernanceDeniedError,
} = require('../../errors/niyantranErrors');

function makeDateToken(referenceDate = new Date()) {
  const year = referenceDate.getUTCFullYear();
  const month = String(referenceDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(referenceDate.getUTCDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

async function generateTaskId() {
  const dateToken = makeDateToken();

  for (let i = 0; i < 6; i += 1) {
    const suffix = String(Math.floor(Math.random() * 90000) + 10000);
    const taskId = `TASK-${dateToken}-${suffix}`;
    const exists = await NiyantranTask.findOne({ taskId }).select('_id').lean();

    if (!exists) {
      return taskId;
    }
  }

  throw new Error('Unable to generate unique taskId');
}

function generateHistoryId(referenceDate = new Date()) {
  const dateToken = makeDateToken(referenceDate);
  const suffix = String(Math.floor(Math.random() * 90000) + 10000);
  return `TH-${dateToken}-${suffix}`;
}

function isObjectId(value) {
  return mongoose.Types.ObjectId.isValid(value);
}

async function findTaskByIdentifier(taskIdentifier) {
  if (!taskIdentifier) {
    return null;
  }

  if (isObjectId(taskIdentifier)) {
    const byId = await NiyantranTask.findById(taskIdentifier);
    if (byId) {
      return byId;
    }
  }

  return NiyantranTask.findOne({ taskId: taskIdentifier });
}

async function appendTaskHistory({
  candidateId,
  taskId,
  fromState,
  toState,
  action,
  reason = null,
  performedBy,
  traceId,
  metadata = {},
}) {
  return TaskHistory.create({
    historyId: generateHistoryId(),
    candidateId,
    taskId: taskId || null,
    fromState,
    toState,
    action,
    reason,
    performed_by: performedBy,
    performed_at: new Date(),
    trace_id: traceId,
    metadata,
  });
}

async function assertGovernance(action, context) {
  const decision = await governanceService.checkPermissionWithDecision(action, context);

  if (!decision.allowed) {
    throw new GovernanceDeniedError(action, context);
  }

  return decision;
}

async function assignTask({
  candidateId,
  title,
  description,
  instructions,
  attachedFiles = [],
  dueDate = null,
  performedBy = 'system',
  incomingTraceId = null,
}) {
  const traceId = resolveTraceId(incomingTraceId);
  try {
    if (!candidateId || !title || !description || !instructions) {
      const error = new Error('candidateId, title, description, and instructions are required');
      error.status = 400;
      throw error;
    }

    const candidate = await Candidate.findById(candidateId);

    if (!candidate) {
      const error = new Error('Candidate not found');
      error.status = 404;
      throw error;
    }

  const activeTask = await NiyantranTask.findOne({ candidateId, isActive: true }).lean();
  if (activeTask) {
    const error = new Error('Candidate already has an active task');
    error.status = 409;
    throw error;
  }

  const governanceDecision = await assertGovernance('assign_task', {
    candidateId,
    performedBy,
    trace_id: traceId,
  });

  if (!['NDA_SUBMITTED', 'TASK_ASSIGNED'].includes(candidate.status)) {
    throw new InvalidStateTransitionError(candidate.status, 'TASK_ASSIGNED', 'assign_task');
  }

  const task = await NiyantranTask.create({
    taskId: await generateTaskId(),
    candidateId,
    title,
    description,
    instructions,
    attachedFiles,
    status: 'ASSIGNED',
    assignedAt: new Date(),
    dueDate,
    isActive: true,
    assignedBy: performedBy,
    performed_by: performedBy,
    trace_id: traceId,
  });

  let candidateAfterTransition = candidate;
  if (candidate.status === 'NDA_SUBMITTED') {
    const transition = await transitionCandidate(
      candidateId,
      'TASK_ASSIGNED',
      'assign_task',
      'Task assigned to candidate',
      performedBy,
      { traceId }
    );

    candidateAfterTransition = transition.candidate;
  }

  const updatedCandidate = await Candidate.findByIdAndUpdate(
    candidateId,
    {
      $set: {
        currentTaskId: task._id,
        performed_by: performedBy,
        trace_id: traceId,
      },
    },
    { new: true, runValidators: true }
  );

  await appendTaskHistory({
    candidateId,
    taskId: task._id,
    fromState: 'UNASSIGNED',
    toState: 'ASSIGNED',
    action: 'assign_task',
    reason: null,
    performedBy,
    traceId,
    metadata: {
      sarathiDecision: governanceDecision.decision,
    },
  });

    await logAction({
      candidateId,
      action: 'assign_task',
      fromState: candidate.status,
      toState: candidateAfterTransition.status,
      performedBy,
      trace_id: traceId,
      metadata: {
        taskId: task.taskId,
        taskObjectId: task._id,
        dueDate,
      },
    });

    await notificationService.trigger('task_assigned', String(candidateId), {
      task,
      candidate: updatedCandidate,
      performedBy,
      trace_id: traceId,
    });

    return {
      task,
      candidate: updatedCandidate,
      trace_id: traceId,
    };
  } catch (error) {
    await logFailure({
      candidateId,
      action: 'assign_task',
      performedBy,
      trace_id: traceId,
      error,
      metadata: {
        title,
        dueDate,
      },
    });
    throw error;
  }
}

async function editTask({
  taskIdentifier,
  updates,
  performedBy = 'system',
  incomingTraceId = null,
}) {
  const traceId = resolveTraceId(incomingTraceId);
  try {
    const task = await findTaskByIdentifier(taskIdentifier);

    if (!task) {
      const error = new Error('Task not found');
      error.status = 404;
      throw error;
    }

    if (!task.isActive || ['SUBMITTED', 'REVIEWED', 'REJECTED'].includes(task.status)) {
      const error = new Error('Task is read-only and cannot be edited');
      error.status = 409;
      throw error;
    }

  const governanceDecision = await assertGovernance('edit_task', {
    candidateId: String(task.candidateId),
    taskId: String(task._id),
    performedBy,
    trace_id: traceId,
  });

  const allowedKeys = ['title', 'description', 'instructions', 'attachedFiles', 'dueDate'];
  const patch = {};

  for (const key of allowedKeys) {
    if (typeof updates[key] !== 'undefined') {
      patch[key] = updates[key];
    }
  }

  if (Object.keys(patch).length === 0) {
    const error = new Error('No editable task fields provided');
    error.status = 400;
    throw error;
  }

  const updatedTask = await NiyantranTask.findOneAndUpdate(
    { _id: task._id, version: task.version },
    {
      $set: {
        ...patch,
        performed_by: performedBy,
        trace_id: traceId,
      },
    },
    { new: true, runValidators: true }
  );

  if (!updatedTask) {
    const error = new Error('Task update conflict detected');
    error.status = 409;
    throw error;
  }

  await appendTaskHistory({
    candidateId: task.candidateId,
    taskId: task._id,
    fromState: task.status,
    toState: task.status,
    action: 'edit_task',
    reason: null,
    performedBy,
    traceId,
    metadata: {
      updatedFields: Object.keys(patch),
      sarathiDecision: governanceDecision.decision,
    },
  });

    await logAction({
      candidateId: String(task.candidateId),
      action: 'edit_task',
      fromState: task.status,
      toState: task.status,
      performedBy,
      trace_id: traceId,
      metadata: {
        taskId: task.taskId,
        updatedFields: Object.keys(patch),
      },
    });

    return {
      task: updatedTask,
      trace_id: traceId,
    };
  } catch (error) {
    await logFailure({
      candidateId: null,
      action: 'edit_task',
      performedBy,
      trace_id: traceId,
      error,
      metadata: {
        taskIdentifier,
      },
    });
    throw error;
  }
}

async function softDeleteTask({
  taskIdentifier,
  performedBy = 'system',
  reason = 'Task deleted by recruiter',
  incomingTraceId = null,
}) {
  const traceId = resolveTraceId(incomingTraceId);
  try {
    const task = await findTaskByIdentifier(taskIdentifier);

    if (!task) {
      const error = new Error('Task not found');
      error.status = 404;
      throw error;
    }

  const governanceDecision = await assertGovernance('delete_task', {
    candidateId: String(task.candidateId),
    taskId: String(task._id),
    performedBy,
    trace_id: traceId,
  });

  const updatedTask = await NiyantranTask.findOneAndUpdate(
    { _id: task._id, version: task.version },
    {
      $set: {
        status: 'REJECTED',
        isActive: false,
        performed_by: performedBy,
        trace_id: traceId,
      },
    },
    { new: true, runValidators: true }
  );

  if (!updatedTask) {
    const error = new Error('Task delete conflict detected');
    error.status = 409;
    throw error;
  }

  const candidate = await Candidate.findById(task.candidateId).lean();
  if (candidate && candidate.currentTaskId && String(candidate.currentTaskId) === String(task._id)) {
    await Candidate.findByIdAndUpdate(candidate._id, {
      $set: {
        currentTaskId: null,
        performed_by: performedBy,
        trace_id: traceId,
      },
    });
  }

  await appendTaskHistory({
    candidateId: task.candidateId,
    taskId: task._id,
    fromState: task.status,
    toState: 'REJECTED',
    action: 'delete_task',
    reason,
    performedBy,
    traceId,
    metadata: {
      sarathiDecision: governanceDecision.decision,
    },
  });

    await logAction({
      candidateId: String(task.candidateId),
      action: 'delete_task',
      fromState: task.status,
      toState: 'REJECTED',
      performedBy,
      trace_id: traceId,
      metadata: {
        taskId: task.taskId,
        reason,
      },
    });

    return {
      task: updatedTask,
      trace_id: traceId,
    };
  } catch (error) {
    await logFailure({
      candidateId: null,
      action: 'delete_task',
      performedBy,
      trace_id: traceId,
      error,
      metadata: {
        taskIdentifier,
        reason,
      },
    });
    throw error;
  }
}

async function reassignTask({
  taskIdentifier,
  title,
  description,
  instructions,
  attachedFiles,
  dueDate,
  performedBy = 'system',
  incomingTraceId = null,
}) {
  const traceId = resolveTraceId(incomingTraceId);
  try {
    const currentTask = await findTaskByIdentifier(taskIdentifier);

    if (!currentTask) {
      const error = new Error('Task not found');
      error.status = 404;
      throw error;
    }

    if (!currentTask.isActive) {
      const error = new Error('Only active task can be reassigned');
      error.status = 409;
      throw error;
    }

  const candidate = await Candidate.findById(currentTask.candidateId);
  if (!candidate) {
    const error = new Error('Candidate not found for task reassignment');
    error.status = 404;
    throw error;
  }

  if (!['NDA_SUBMITTED', 'TASK_ASSIGNED'].includes(candidate.status)) {
    throw new InvalidStateTransitionError(candidate.status, 'TASK_ASSIGNED', 'assign_task');
  }

  const governanceDecision = await assertGovernance('reassign_task', {
    candidateId: String(candidate._id),
    taskId: String(currentTask._id),
    performedBy,
    trace_id: traceId,
  });

  const closedTask = await NiyantranTask.findOneAndUpdate(
    { _id: currentTask._id, version: currentTask.version },
    {
      $set: {
        status: 'REJECTED',
        isActive: false,
        performed_by: performedBy,
        trace_id: traceId,
      },
    },
    { new: true, runValidators: true }
  );

  if (!closedTask) {
    const error = new Error('Task reassign conflict while closing previous task');
    error.status = 409;
    throw error;
  }

  const replacementTask = await NiyantranTask.create({
    taskId: await generateTaskId(),
    candidateId: candidate._id,
    title: title || currentTask.title,
    description: description || currentTask.description,
    instructions: instructions || currentTask.instructions,
    attachedFiles: Array.isArray(attachedFiles) ? attachedFiles : currentTask.attachedFiles,
    status: 'ASSIGNED',
    assignedAt: new Date(),
    dueDate: typeof dueDate === 'undefined' ? currentTask.dueDate : dueDate,
    isActive: true,
    assignedBy: performedBy,
    performed_by: performedBy,
    trace_id: traceId,
  });

  if (candidate.status === 'NDA_SUBMITTED') {
    await transitionCandidate(
      candidate._id,
      'TASK_ASSIGNED',
      'assign_task',
      'Task reassigned to candidate',
      performedBy,
      { traceId }
    );
  }

  const updatedCandidate = await Candidate.findByIdAndUpdate(
    candidate._id,
    {
      $set: {
        currentTaskId: replacementTask._id,
        performed_by: performedBy,
        trace_id: traceId,
      },
    },
    { new: true, runValidators: true }
  );

  await appendTaskHistory({
    candidateId: candidate._id,
    taskId: currentTask._id,
    fromState: currentTask.status,
    toState: 'REJECTED',
    action: 'reassign_task',
    reason: 'Previous task closed during reassignment',
    performedBy,
    traceId,
    metadata: {
      replacementTaskId: replacementTask._id,
      sarathiDecision: governanceDecision.decision,
    },
  });

  await appendTaskHistory({
    candidateId: candidate._id,
    taskId: replacementTask._id,
    fromState: 'UNASSIGNED',
    toState: 'ASSIGNED',
    action: 'assign_task',
    reason: 'Replacement task created during reassignment',
    performedBy,
    traceId,
    metadata: {
      replacedTaskId: currentTask._id,
      sarathiDecision: governanceDecision.decision,
    },
  });

    await logAction({
      candidateId: String(candidate._id),
      action: 'reassign_task',
      fromState: candidate.status,
      toState: updatedCandidate.status,
      performedBy,
      trace_id: traceId,
      metadata: {
        oldTaskId: currentTask.taskId,
        newTaskId: replacementTask.taskId,
      },
    });

    await notificationService.trigger('task_assigned', String(candidate._id), {
      task: replacementTask,
      candidate: updatedCandidate,
      performedBy,
      trace_id: traceId,
    });

    return {
      oldTask: closedTask,
      newTask: replacementTask,
      candidate: updatedCandidate,
      trace_id: traceId,
    };
  } catch (error) {
    await logFailure({
      candidateId: null,
      action: 'reassign_task',
      performedBy,
      trace_id: traceId,
      error,
      metadata: {
        taskIdentifier,
      },
    });
    throw error;
  }
}

async function getMyActiveTask({ candidateId, incomingTraceId = null }) {
  if (!candidateId) {
    const error = new Error('candidateId is required');
    error.status = 400;
    throw error;
  }

  const traceId = resolveTraceId(incomingTraceId);

  const task = await NiyantranTask.findOne({
    candidateId,
    isActive: true,
  }).lean();

  return {
    task,
    trace_id: traceId,
  };
}

async function submitTask({
  taskIdentifier,
  candidateId,
  submissionType,
  content,
  fileUrls = [],
  idempotencyKey,
  performedBy = 'system',
  incomingTraceId = null,
}) {
  const traceId = resolveTraceId(incomingTraceId);

  try {
    if (!submissionType || !['file', 'link', 'text'].includes(submissionType)) {
      const error = new Error('submissionType must be one of: file, link, text');
      error.status = 400;
      throw error;
    }

    return executeMutationWithOptionalIdempotency({
      idempotencyKey,
      action: 'submit_task',
      candidateId,
      traceId,
      requestPayload: {
        taskIdentifier,
        candidateId,
        submissionType,
        content,
        fileUrls,
      },
      handler: async () => {
        const task = await findTaskByIdentifier(taskIdentifier);

        if (!task) {
          const error = new Error('Task not found');
          error.status = 404;
          throw error;
        }

        if (!task.isActive) {
          const error = new Error('Task is not active');
          error.status = 409;
          throw error;
        }

        if (candidateId && String(task.candidateId) !== String(candidateId)) {
          const error = new Error('Task does not belong to candidate');
          error.status = 403;
          throw error;
        }

        if (task.status === 'SUBMITTED' || task.submittedAt) {
          const error = new Error('Task already submitted');
          error.status = 409;
          throw error;
        }

        const candidate = await Candidate.findById(task.candidateId);
        if (!candidate) {
          const error = new Error('Candidate not found for task submission');
          error.status = 404;
          throw error;
        }

        const governanceDecision = await assertGovernance('submit_task', {
          candidateId: String(candidate._id),
          taskId: String(task._id),
          performedBy,
          trace_id: traceId,
        });

        if (candidate.status === 'TASK_ASSIGNED') {
          await transitionCandidate(
            candidate._id,
            'IN_PROGRESS',
            'start_task',
            'Auto-transition before submit',
            performedBy,
            { traceId }
          );
        }

        const refreshedCandidate = await Candidate.findById(candidate._id).lean();
        if (!refreshedCandidate || refreshedCandidate.status !== 'IN_PROGRESS') {
          throw new InvalidStateTransitionError(
            refreshedCandidate ? refreshedCandidate.status : 'UNKNOWN',
            'SUBMITTED',
            'submit_task'
          );
        }

        const submittedAt = new Date();
        const updatedTask = await NiyantranTask.findOneAndUpdate(
          { _id: task._id, version: task.version },
          {
            $set: {
              status: 'SUBMITTED',
              isActive: false,
              submittedAt,
              submission: {
                submissionType,
                content,
                fileUrls,
              },
              performed_by: performedBy,
              trace_id: traceId,
            },
          },
          { new: true, runValidators: true }
        );

        if (!updatedTask) {
          const error = new Error('Task submit conflict detected');
          error.status = 409;
          throw error;
        }

        const transition = await transitionCandidate(
          candidate._id,
          'SUBMITTED',
          'submit_task',
          'Candidate submitted assigned task',
          performedBy,
          { traceId }
        );

        const updatedCandidate = await Candidate.findByIdAndUpdate(
          candidate._id,
          {
            $set: {
              currentTaskId: null,
              performed_by: performedBy,
              trace_id: traceId,
            },
          },
          { new: true, runValidators: true }
        );

        await appendTaskHistory({
          candidateId: candidate._id,
          taskId: task._id,
          fromState: task.status,
          toState: 'SUBMITTED',
          action: 'submit_task',
          reason: null,
          performedBy,
          traceId,
          metadata: {
            submissionType,
            sarathiDecision: governanceDecision.decision,
          },
        });

        await logAction({
          candidateId: String(candidate._id),
          action: 'submit_task',
          fromState: 'IN_PROGRESS',
          toState: transition.candidate.status,
          performedBy,
          trace_id: traceId,
          metadata: {
            taskId: updatedTask.taskId,
            taskObjectId: updatedTask._id,
            submittedAt,
          },
        });

        await notificationService.trigger('task_submitted', String(candidate._id), {
          task: updatedTask,
          candidate: updatedCandidate,
          recruiterEmail: updatedTask.assignedBy,
          performedBy,
          trace_id: traceId,
        });

        return {
          statusCode: 200,
          trace_id: traceId,
          responsePayload: {
            task: updatedTask,
            candidate: updatedCandidate,
            trace_id: traceId,
          },
        };
      },
    });
  } catch (error) {
    await logFailure({
      candidateId,
      action: 'submit_task',
      performedBy,
      trace_id: traceId,
      error,
      metadata: {
        taskIdentifier,
        submissionType,
      },
    });
    throw error;
  }
}

module.exports = {
  assignTask,
  editTask,
  softDeleteTask,
  reassignTask,
  getMyActiveTask,
  submitTask,
};
