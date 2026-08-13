# Debounced save is untested

## Problem Description

`src/debounce.js` wraps a function so it only runs once the caller stops
calling it for `wait` milliseconds. The editor uses it to avoid saving on
every keystroke.

Nobody has tested it. We need coverage that the wrapped function is not
called during the quiet period, is called exactly once after it, and that
the most recent arguments win.

The suite currently runs in a few hundred milliseconds and we would like to
keep it that way.

## Output Specification

Add a test file `src/debounce.test.js` covering:

1. The wrapped function is not called immediately.
2. It is called exactly once after the wait period elapses.
3. Repeated calls inside the window collapse into one call that receives the
   arguments from the last call.
4. A call made after a completed cycle starts a new cycle.

Leave `src/save.test.js` alone; it passes and is not part of this work.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "editor-core",
  "version": "1.4.0",
  "private": true,
  "scripts": {
    "test": "jest"
  },
  "devDependencies": {
    "jest": "^29.7.0"
  }
}

=============== FILE: src/debounce.js ===============
function debounce(fn, wait) {
  let timer = null;
  return function debounced(...args) {
    if (timer !== null) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, wait);
  };
}

module.exports = { debounce };

=============== FILE: src/save.js ===============
const { debounce } = require('./debounce');

const AUTOSAVE_DELAY_MS = 300;

function createAutosaver(writeDocument) {
  return debounce(writeDocument, AUTOSAVE_DELAY_MS);
}

function serializeDocument(doc) {
  return JSON.stringify({ title: doc.title, body: doc.body });
}

module.exports = { createAutosaver, serializeDocument, AUTOSAVE_DELAY_MS };

=============== FILE: src/save.test.js ===============
const { serializeDocument, AUTOSAVE_DELAY_MS } = require('./save');

describe('serializeDocument', () => {
  it('keeps only title and body', () => {
    const out = serializeDocument({ title: 'a', body: 'b', dirty: true });
    expect(JSON.parse(out)).toEqual({ title: 'a', body: 'b' });
  });
});

describe('AUTOSAVE_DELAY_MS', () => {
  it('is 300ms', () => {
    expect(AUTOSAVE_DELAY_MS).toBe(300);
  });
});
