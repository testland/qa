import test from 'node:test';
import assert from 'node:assert/strict';
import { envelopeShape, underSixtyChars, noCompetitorNames } from './subject-line.js';

const ok = JSON.stringify({ subject: 'Your plan renews in 14 days', preheader: 'Nothing to do.' });

test('envelopeShape accepts exactly subject and preheader', () => {
  assert.equal(envelopeShape(ok), true);
});

test('envelopeShape rejects an extra key', () => {
  const extra = JSON.stringify({ subject: 'a', preheader: 'b', tone: 'warm' });
  assert.equal(envelopeShape(extra), false);
});

test('envelopeShape rejects a non-string subject', () => {
  assert.equal(envelopeShape(JSON.stringify({ subject: 12, preheader: 'b' })), false);
});

test('underSixtyChars accepts a 60 character subject', () => {
  assert.equal(underSixtyChars(JSON.stringify({ subject: 'x'.repeat(60), preheader: '' })), true);
});

test('underSixtyChars rejects a 61 character subject', () => {
  assert.equal(underSixtyChars(JSON.stringify({ subject: 'x'.repeat(61), preheader: '' })), false);
});

test('noCompetitorNames passes clean copy', () => {
  assert.equal(noCompetitorNames(ok), true);
});

test('noCompetitorNames catches a competitor in the preheader', () => {
  const bad = JSON.stringify({ subject: 'Switch today', preheader: 'Faster than blastly.' });
  assert.equal(noCompetitorNames(bad), false);
});
