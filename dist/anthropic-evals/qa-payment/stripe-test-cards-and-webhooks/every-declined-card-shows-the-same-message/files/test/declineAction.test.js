'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { declineAction } = require('../src/declineAction');

test('a generic decline points the customer at their bank', () => {
  const action = declineAction({
    type: 'card_error',
    code: 'card_declined',
    decline_code: 'generic_decline',
    message: 'Your card was declined.',
  });

  assert.match(action.message, /contact your bank/i);
  assert.equal(action.retryable, true);
  assert.equal(action.notifyRisk, false);
});

test('insufficient funds gets its own message', () => {
  const action = declineAction({
    type: 'card_error',
    code: 'card_declined',
    decline_code: 'insufficient_funds',
    message: 'Your card has insufficient funds.',
  });

  assert.match(action.message, /insufficient funds/i);
  assert.equal(action.retryable, true);
});
