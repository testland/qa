import test from 'node:test';
import assert from 'node:assert/strict';
import { normalize, scoreOne } from './runner.mjs';

test('normalize lowercases and collapses whitespace', () => {
  assert.equal(normalize('  Billing   Question '), 'billing question');
});

test('contains matches regardless of case', () => {
  assert.equal(scoreOne('A REFUND of 12.33 was issued', 'contains:refund'), true);
});

test('contains fails when the phrase is absent', () => {
  assert.equal(scoreOne('No money is owed', 'contains:refund'), false);
});

test('equals matches after normalization', () => {
  assert.equal(scoreOne('  billing_question ', 'equals:billing_question'), true);
});

test('equals fails on a different label', () => {
  assert.equal(scoreOne('account_access', 'equals:billing_question'), false);
});
