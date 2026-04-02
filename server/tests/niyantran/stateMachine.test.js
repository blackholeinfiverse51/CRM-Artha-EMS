const test = require('node:test');
const assert = require('node:assert/strict');

const {
  PIPELINE_STATES,
  ACTION_TRANSITIONS,
  validateTransition,
  getNextPossibleStates,
} = require('../../utils/niyantran/stateMachine');

test('all declared action transitions are valid', () => {
  for (const [action, rule] of Object.entries(ACTION_TRANSITIONS)) {
    assert.equal(validateTransition(rule.from, rule.to, action), true);
  }
});

test('all undeclared transition combinations are invalid', () => {
  const actions = Object.keys(ACTION_TRANSITIONS);

  for (const fromState of PIPELINE_STATES) {
    for (const toState of PIPELINE_STATES) {
      for (const action of actions) {
        const rule = ACTION_TRANSITIONS[action];
        const expected = rule.from === fromState && rule.to === toState;

        assert.equal(
          validateTransition(fromState, toState, action),
          expected,
          `Unexpected result for ${fromState} -> ${toState} (${action})`
        );
      }
    }
  }
});

test('invalid state jump is blocked', () => {
  assert.equal(validateTransition('APPLIED', 'NDA_PENDING', 'shortlist_candidate'), false);
});

test('action mismatch is blocked', () => {
  assert.equal(validateTransition('APPLIED', 'SHORTLISTED', 'assign_task'), false);
});

test('unknown action is blocked', () => {
  assert.equal(validateTransition('APPLIED', 'SHORTLISTED', 'unknown_action'), false);
});

test('terminal states have no next states', () => {
  assert.deepEqual(getNextPossibleStates('HIRED'), []);
  assert.deepEqual(getNextPossibleStates('REJECTED'), []);
});

test('next states are exact and deterministic', () => {
  const first = getNextPossibleStates('REVIEWED');
  const second = getNextPossibleStates('reviewed');

  assert.deepEqual(first, ['HIRED', 'REJECTED']);
  assert.deepEqual(second, ['HIRED', 'REJECTED']);
  assert.notEqual(first, second);
});

test('validateTransition is deterministic for same input', () => {
  const input = ['IN_PROGRESS', 'SUBMITTED', 'submit_task'];
  const first = validateTransition(...input);
  const second = validateTransition(...input);
  const third = validateTransition(...input);

  assert.equal(first, true);
  assert.equal(second, true);
  assert.equal(third, true);
});
