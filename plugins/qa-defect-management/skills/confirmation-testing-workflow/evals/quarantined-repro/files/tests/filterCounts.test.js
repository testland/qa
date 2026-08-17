'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { recount } = require('../src/filterCounts');

const ITEMS = [
  { colour: 'black', size: '40' },
  { colour: 'black', size: '41' },
  { colour: 'tan', size: '41' },
];

test('recount narrows to the active facet', () => {
  assert.deepEqual(recount(ITEMS, { colour: 'black' }).size, { 40: 1, 41: 1 });
});

test('recount with no active facet counts everything', () => {
  assert.deepEqual(recount(ITEMS, {}).size, { 40: 1, 41: 2 });
});
