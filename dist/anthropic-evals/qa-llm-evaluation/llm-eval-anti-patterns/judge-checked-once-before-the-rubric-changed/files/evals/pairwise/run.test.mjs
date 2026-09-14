import test from 'node:test';
import assert from 'node:assert/strict';
import { buildJudgePrompt, slotsFor, winnerFromVerdict, tally, tallyBySlot, RUBRIC } from './run.mjs';

const replies = { baseline: 'reply from A', candidate: 'reply from B' };

test('the slot order alternates across pairs', () => {
  assert.deepEqual(slotsFor(0), ['baseline', 'candidate']);
  assert.deepEqual(slotsFor(1), ['candidate', 'baseline']);
});

test('judge prompt carries both replies and the rubric', () => {
  const p = buildJudgePrompt(RUBRIC, replies, 0);
  assert.ok(p.includes('reply from A'));
  assert.ok(p.includes('reply from B'));
  assert.ok(p.includes(RUBRIC));
});

test('the candidate leads on odd pairs', () => {
  const p = buildJudgePrompt(RUBRIC, replies, 1);
  assert.ok(p.indexOf('reply from B') < p.indexOf('reply from A'));
});

test('a verdict is resolved against the order that pair was shown in', () => {
  assert.equal(winnerFromVerdict('2', 0), 'candidate');
  assert.equal(winnerFromVerdict('2', 1), 'baseline');
  assert.equal(winnerFromVerdict(' 1 ', 1), 'candidate');
});

test('tally counts both sides', () => {
  const results = [
    { pairIndex: 0, verdict: '2' },
    { pairIndex: 1, verdict: '1' },
    { pairIndex: 2, verdict: '1' },
    { pairIndex: 3, verdict: '2' },
  ];
  assert.deepEqual(tally(results), { baseline: 2, candidate: 2 });
});

test('the slot split is reported separately', () => {
  const results = [
    { pairIndex: 0, verdict: '2' },
    { pairIndex: 1, verdict: '1' },
  ];
  assert.deepEqual(tallyBySlot(results), { candidateInSlot1: 1, candidateInSlot2: 1 });
});
