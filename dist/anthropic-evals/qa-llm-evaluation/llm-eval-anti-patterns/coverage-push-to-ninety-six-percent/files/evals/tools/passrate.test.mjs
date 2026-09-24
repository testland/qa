import test from 'node:test';
import assert from 'node:assert/strict';
import { parseInventory, totals, rate } from './passrate.mjs';

const csv = [
  'group,cases,passing,failing,first_added',
  '# a comment line is ignored',
  'alpha,10,8,2,2026-01-01',
  'beta,4,0,4,2026-02-01',
].join('\n');

test('comments and the header are skipped', () => {
  assert.equal(parseInventory(csv).length, 2);
});

test('rows carry their counts', () => {
  const [alpha] = parseInventory(csv);
  assert.deepEqual(alpha, { group: 'alpha', cases: 10, passing: 8, failing: 2, firstAdded: '2026-01-01' });
});

test('totals add up across groups', () => {
  assert.deepEqual(totals(parseInventory(csv)), { cases: 14, passing: 8, failing: 6 });
});

test('rate is a percentage to one decimal', () => {
  assert.equal(rate({ passing: 8, cases: 14 }), 57.1);
  assert.equal(rate({ passing: 0, cases: 0 }), 0);
});
