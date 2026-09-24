'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { byId } = require('./sarRequests');
const { isOverdue } = require('./sarDeadline');

const TODAY = '2026-06-10';

test('a request answered inside its window is not overdue', () => {
  assert.equal(isOverdue(byId('sar_101'), TODAY), false);
});

test('a request answered after its window closed is overdue', () => {
  assert.equal(isOverdue(byId('sar_102'), TODAY), true);
});

test('a request still open and inside its window is not overdue', () => {
  assert.equal(isOverdue(byId('sar_107'), TODAY), false);
});
