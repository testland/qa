import test from 'node:test';
import assert from 'node:assert/strict';
import { buildJudgePrompt, winnerFromVerdict, tally, RUBRIC } from './run.mjs';

test('judge prompt carries both replies', () => {
  const p = buildJudgePrompt(RUBRIC, 'first reply', 'second reply');
  assert.ok(p.includes('first reply'));
  assert.ok(p.includes('second reply'));
});

test('judge prompt carries the rubric', () => {
  assert.ok(buildJudgePrompt(RUBRIC, 'x', 'y').includes(RUBRIC));
});

test('verdict 2 means the candidate won', () => {
  assert.equal(winnerFromVerdict('2'), 'candidate');
});

test('verdict 1 means the baseline won', () => {
  assert.equal(winnerFromVerdict(' 1 '), 'baseline');
});

test('tally counts both sides', () => {
  assert.deepEqual(tally(['1', '2', '2', '2']), { baseline: 1, candidate: 3 });
});
