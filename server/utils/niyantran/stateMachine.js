const PIPELINE_STATES = Object.freeze([
  'APPLIED',
  'SHORTLISTED',
  'NDA_PENDING',
  'NDA_SUBMITTED',
  'TASK_ASSIGNED',
  'IN_PROGRESS',
  'SUBMITTED',
  'REVIEWED',
  'HIRED',
  'REJECTED',
]);

const ALLOWED_TRANSITIONS = Object.freeze({
  APPLIED: Object.freeze(['SHORTLISTED']),
  SHORTLISTED: Object.freeze(['NDA_PENDING']),
  NDA_PENDING: Object.freeze(['NDA_SUBMITTED']),
  NDA_SUBMITTED: Object.freeze(['TASK_ASSIGNED']),
  TASK_ASSIGNED: Object.freeze(['IN_PROGRESS']),
  IN_PROGRESS: Object.freeze(['SUBMITTED']),
  SUBMITTED: Object.freeze(['REVIEWED']),
  REVIEWED: Object.freeze(['HIRED', 'REJECTED']),
  HIRED: Object.freeze([]),
  REJECTED: Object.freeze([]),
});

const ACTION_TRANSITIONS = Object.freeze({
  shortlist_candidate: Object.freeze({ from: 'APPLIED', to: 'SHORTLISTED' }),
  mark_nda_pending: Object.freeze({ from: 'SHORTLISTED', to: 'NDA_PENDING' }),
  submit_nda: Object.freeze({ from: 'NDA_PENDING', to: 'NDA_SUBMITTED' }),
  assign_task: Object.freeze({ from: 'NDA_SUBMITTED', to: 'TASK_ASSIGNED' }),
  start_task: Object.freeze({ from: 'TASK_ASSIGNED', to: 'IN_PROGRESS' }),
  submit_task: Object.freeze({ from: 'IN_PROGRESS', to: 'SUBMITTED' }),
  review_task: Object.freeze({ from: 'SUBMITTED', to: 'REVIEWED' }),
  finalize_hire: Object.freeze({ from: 'REVIEWED', to: 'HIRED' }),
  finalize_reject: Object.freeze({ from: 'REVIEWED', to: 'REJECTED' }),
});

function normalizeState(state) {
  return String(state || '').trim().toUpperCase();
}

function normalizeAction(action) {
  return String(action || '').trim().toLowerCase();
}

function validateTransition(fromState, toState, action) {
  const from = normalizeState(fromState);
  const to = normalizeState(toState);
  const normalizedAction = normalizeAction(action);

  if (!PIPELINE_STATES.includes(from) || !PIPELINE_STATES.includes(to)) {
    return false;
  }

  const nextStates = ALLOWED_TRANSITIONS[from] || [];
  if (!nextStates.includes(to)) {
    return false;
  }

  const actionRule = ACTION_TRANSITIONS[normalizedAction];
  if (!actionRule) {
    return false;
  }

  return actionRule.from === from && actionRule.to === to;
}

function getNextPossibleStates(currentState) {
  const normalizedState = normalizeState(currentState);
  return [...(ALLOWED_TRANSITIONS[normalizedState] || [])];
}

module.exports = {
  PIPELINE_STATES,
  ALLOWED_TRANSITIONS,
  ACTION_TRANSITIONS,
  validateTransition,
  getNextPossibleStates,
  normalizeState,
  normalizeAction,
};
