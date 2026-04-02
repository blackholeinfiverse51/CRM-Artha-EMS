const { Candidate, TaskHistory } = require('../../models/niyantran');
const {
  validateTransition,
  normalizeState,
  normalizeAction,
} = require('../../utils/niyantran/stateMachine');
const governanceService = require('./governanceService');
const { generateTraceId } = require('../../models/niyantran/auditReplayPlugin');
const { logAction, logFailure } = require('./auditService');
const {
  InvalidStateTransitionError,
  GovernanceDeniedError,
  CandidateNotFoundError,
  OptimisticLockError,
} = require('../../errors/niyantranErrors');

function generateHistoryId(referenceDate = new Date()) {
  const year = referenceDate.getUTCFullYear();
  const month = String(referenceDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(referenceDate.getUTCDate()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 90000) + 10000);
  return `TH-${year}${month}${day}-${random}`;
}

async function transitionCandidate(
  candidateId,
  toState,
  action,
  reason = null,
  performedBy = 'system',
  options = {}
) {
  const normalizedToState = normalizeState(toState);
  const normalizedAction = normalizeAction(action);
  const actionTraceId = options.traceId || generateTraceId('trace');

  try {
    const candidate = await Candidate.findById(candidateId).lean();

    if (!candidate) {
      throw new CandidateNotFoundError(candidateId);
    }

    const fromState = candidate.status;

    const governanceResult = await governanceService.checkPermissionWithDecision(normalizedAction, {
      candidateId,
      fromState,
      toState: normalizedToState,
      performedBy,
      reason,
      trace_id: actionTraceId,
    });

    if (!governanceResult.allowed) {
      throw new GovernanceDeniedError(normalizedAction, {
        candidateId,
        fromState,
        toState: normalizedToState,
      });
    }

    if (!validateTransition(fromState, normalizedToState, normalizedAction)) {
      throw new InvalidStateTransitionError(fromState, normalizedToState, normalizedAction);
    }

    const transitionTime = new Date();

    const updatedCandidate = await Candidate.findOneAndUpdate(
      {
        _id: candidateId,
        status: fromState,
        version: candidate.version,
      },
      {
        $set: {
          status: normalizedToState,
          lastStateChangeAt: transitionTime,
          performed_by: performedBy,
          trace_id: actionTraceId,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedCandidate) {
      throw new OptimisticLockError(candidateId);
    }

    const historyRecord = await TaskHistory.create({
      historyId: generateHistoryId(transitionTime),
      candidateId: updatedCandidate._id,
      taskId: updatedCandidate.currentTaskId || null,
      fromState,
      toState: normalizedToState,
      action: normalizedAction,
      reason,
      performed_by: performedBy,
      performed_at: transitionTime,
      trace_id: actionTraceId,
      metadata: {
        sarathiDecision: governanceResult.decision,
      },
    });

    await logAction({
      candidateId: String(updatedCandidate._id),
      action: normalizedAction,
      fromState,
      toState: normalizedToState,
      performedBy,
      trace_id: actionTraceId,
      metadata: {
        taskHistoryId: historyRecord.historyId,
        sarathiDecision: governanceResult.decision,
      },
    });

    return {
      candidate: updatedCandidate,
      history: historyRecord,
      trace_id: actionTraceId,
    };
  } catch (error) {
    await logFailure({
      candidateId,
      action: normalizedAction,
      performedBy,
      trace_id: actionTraceId,
      error,
      metadata: {
        toState: normalizedToState,
      },
    });
    throw error;
  }
}

module.exports = {
  transitionCandidate,
};
