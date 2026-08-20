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
