# One broken assertion reported five failures and we could not find the real one

## Problem Description

On Tuesday a change to the workspace code made the second test in
`tests/workspace.test.js` fail. CI reported five failures. Four of them were
`workspace build is already open`, which is not what broke - the second test
never got as far as releasing its workspace, so every test after it failed on
acquisition, and the message from the one test that actually found the bug was
buried in the middle of the output.

Two of the tests in that file have a second problem we noticed while reading
it: one of them only releases the workspace when its check succeeded, and one
of them hides any error the release raises.

The file is green again today. We want it arranged so that the next time one
test fails, it fails alone.

## Output Specification

1. Change `tests/workspace.test.js` so that a test which fails part-way
   through still releases the workspace it acquired, and so that no release
   is conditional on whether that test's checks passed.
2. A failure while releasing must be reported rather than discarded.
3. Every test keeps its name and its assertions exactly as they are, and all
   five tests remain. Do not modify `src/workspace.js`.
4. The last test asserts that nothing is left open. It must still pass, and
   whatever you add must not leave it holding a workspace of its own.
5. Run `npm test` before you finish; it must pass.
6. Produce `teardown-notes.md` explaining why one failing test produced five
   failing tests, why the real failure was hard to find in that output, and
   the rule for tests added to this file later.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "workspaces",
  "version": "3.1.2",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/workspace.js ===============
'use strict';

const open = new Map();
let nextId = 1;

function openWorkspace(name) {
  if (open.has(name)) {
    throw new Error(`workspace ${name} is already open`);
  }
  const handle = { id: nextId++, name, files: new Map() };
  open.set(name, handle);
  return handle;
}

function closeWorkspace(handle) {
  if (open.get(handle.name) !== handle) {
    throw new Error(`workspace ${handle.name} is not open`);
  }
  open.delete(handle.name);
}

function writeFile(handle, path, body) {
  if (open.get(handle.name) !== handle) {
    throw new Error('workspace is closed');
  }
  handle.files.set(path, body);
}

function readFile(handle, path) {
  if (open.get(handle.name) !== handle) {
    throw new Error('workspace is closed');
  }
  return handle.files.has(path) ? handle.files.get(path) : null;
}

function fileNames(handle) {
  return [...handle.files.keys()];
}

function openCount() {
  return open.size;
}

module.exports = { openWorkspace, closeWorkspace, writeFile, readFile, fileNames, openCount };

=============== FILE: tests/workspace.test.js ===============
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  openWorkspace,
  closeWorkspace,
  writeFile,
  readFile,
  fileNames,
  openCount,
} = require('../src/workspace');

const NAME = 'build';

test('writes a file into the workspace', () => {
  const ws = openWorkspace(NAME);
  writeFile(ws, 'a.txt', 'hello');
  assert.equal(readFile(ws, 'a.txt'), 'hello');
  closeWorkspace(ws);
});

test('overwrites an existing file', () => {
  const ws = openWorkspace(NAME);
  writeFile(ws, 'a.txt', 'one');
  writeFile(ws, 'a.txt', 'two');
  assert.equal(readFile(ws, 'a.txt'), 'two');
  closeWorkspace(ws);
});

test('lists the files it holds', () => {
  const ws = openWorkspace(NAME);
  writeFile(ws, 'a.txt', 'x');
  writeFile(ws, 'b.txt', 'y');
  const listed = fileNames(ws).length === 2;
  assert.ok(listed);
  if (listed) {
    closeWorkspace(ws);
  }
});

test('returns null for a missing file', () => {
  const ws = openWorkspace(NAME);
  assert.equal(readFile(ws, 'missing.txt'), null);
  try {
    closeWorkspace(ws);
  } catch (err) {
    // nothing we can do here
  }
});

test('leaves no workspace open', () => {
  assert.equal(openCount(), 0);
});
