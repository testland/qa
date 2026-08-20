'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { searchNotes } = require('./searchNotes');

test('finds a note by title', () => {
  const result = searchNotes({ q: 'backup' });
  assert.equal(result.status, 200);
  assert.equal(result.results.length, 1);
  assert.equal(result.results[0].id, 'n_3');
});
