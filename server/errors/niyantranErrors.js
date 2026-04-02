class InvalidStateTransitionError extends Error {
  constructor(fromState, toState, action) {
    super(`Invalid transition: ${fromState} -> ${toState} for action ${action}`);
    this.name = 'InvalidStateTransitionError';
    this.status = 409;
    this.code = 'INVALID_STATE_TRANSITION';
    this.fromState = fromState;
    this.toState = toState;
    this.action = action;
  }
}

class GovernanceDeniedError extends Error {
  constructor(action, context = {}) {
    super(`Governance denied action: ${action}`);
    this.name = 'GovernanceDeniedError';
    this.status = 403;
    this.code = 'GOVERNANCE_DENIED';
    this.action = action;
    this.context = context;
  }
}

class CandidateNotFoundError extends Error {
  constructor(candidateId) {
    super(`Candidate not found: ${candidateId}`);
    this.name = 'CandidateNotFoundError';
    this.status = 404;
    this.code = 'CANDIDATE_NOT_FOUND';
    this.candidateId = candidateId;
  }
}

class OptimisticLockError extends Error {
  constructor(candidateId) {
    super(`Candidate update conflict for ${candidateId}`);
    this.name = 'OptimisticLockError';
    this.status = 409;
    this.code = 'OPTIMISTIC_LOCK_CONFLICT';
    this.candidateId = candidateId;
  }
}

module.exports = {
  InvalidStateTransitionError,
  GovernanceDeniedError,
  CandidateNotFoundError,
  OptimisticLockError,
};
