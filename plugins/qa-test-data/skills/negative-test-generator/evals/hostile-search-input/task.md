# Search endpoint has no coverage for hostile input

## Problem Description

`src/searchNotes.js` backs the note search box. A search term is user input
that reaches two dangerous places: the database statement and the rendered
HTML of the results page.

The handler is deliberate about both. The term itself is never part of the
statement text - it travels as a bound parameter, so a term full of quotes and
comment markers is a perfectly ordinary search that simply finds nothing. The
sort direction is different: it is interpolated into the statement, so it is
taken from a fixed map and anything else is refused. Everything the handler
renders is escaped on the way out.

A pen-test report came back with a list of strings the tester submitted -
injection attempts and markup payloads. None of them broke anything, and none
of them are in the suite either. The one test we have searches for the word
"backup".

## Output Specification

1. Add `src/searchNotes.test.js` covering how this handler treats hostile
   input, including the injection and markup strings an attacker would
   actually send.
2. A change that put a search term into the statement text, or that returned
   an unescaped term or title, must fail the suite.
3. Do not modify `src/searchNotes.js`; its current behaviour is the
   specification.
4. Leave `src/searchNotes.happy.test.js` in place.
5. Run `npm test` before you finish; it must pass.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "notes-search",
  "version": "1.9.3",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/searchNotes.js ===============
'use strict';

const SORTS = { recent: 'updated_at DESC', title: 'title ASC' };
const MAX_QUERY_LENGTH = 200;

const NOTES = [
  { id: 'n_1', title: 'Release <script>alert(1)</script> notes' },
  { id: 'n_2', title: "O'Brien onboarding" },
  { id: 'n_3', title: 'Backup rotation' },
];

function hasControlCharacter(value) {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code < 32 || code === 127) {
      return true;
    }
  }
  return false;
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function searchNotes(params) {
  const { q, sort = 'recent' } = params || {};

  if (typeof q !== 'string') {
    return { status: 400, code: 'QUERY_REQUIRED' };
  }
  if (q.trim() === '') {
    return { status: 400, code: 'QUERY_EMPTY' };
  }
  if (q.length > MAX_QUERY_LENGTH) {
    return { status: 400, code: 'QUERY_TOO_LONG' };
  }
  if (hasControlCharacter(q)) {
    return { status: 400, code: 'QUERY_ILLEGAL_CHARACTERS' };
  }
  if (!Object.prototype.hasOwnProperty.call(SORTS, sort)) {
    return { status: 400, code: 'SORT_UNSUPPORTED' };
  }

  const query = {
    sql: `SELECT id, title FROM notes WHERE title LIKE ? ORDER BY ${SORTS[sort]}`,
    params: [`%${q}%`],
  };
  const needle = q.toLowerCase();
  const results = NOTES.filter((note) => note.title.toLowerCase().includes(needle)).map((note) => ({
    id: note.id,
    titleHtml: escapeHtml(note.title),
  }));

  return { status: 200, code: null, query, results, echoHtml: escapeHtml(q) };
}

module.exports = { searchNotes, MAX_QUERY_LENGTH, SORTS };

=============== FILE: src/searchNotes.happy.test.js ===============
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
