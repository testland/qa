import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createShortcuts } from '../src/shortcuts.js';

const ACTION_NAMES = [
  'focusSearch',
  'nextThread',
  'prevThread',
  'archiveThread',
  'archiveAndNext',
  'toggleSelect',
  'backToList',
  'openShortcutHelp',
  'closeCompose',
  'openCommandPalette',
];

function recorder() {
  const calls = [];
  const actions = {};
  for (const name of ACTION_NAMES) actions[name] = () => calls.push(name);
  return { calls, actions };
}

function key(k, extra = {}) {
  return {
    key: k,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    target: { tagName: 'DIV', isContentEditable: false },
    ...extra,
  };
}

test('slash jumps to search', () => {
  const { calls, actions } = recorder();
  const handle = createShortcuts(actions);
  handle(key('/'));
  assert.deepEqual(calls, ['focusSearch']);
});

test('j and k walk the thread list', () => {
  const { calls, actions } = recorder();
  const handle = createShortcuts(actions);
  handle(key('j'));
  handle(key('k'));
  assert.deepEqual(calls, ['nextThread', 'prevThread']);
});

test('shift+e archives and advances, shift+slash opens help', () => {
  const { calls, actions } = recorder();
  const handle = createShortcuts(actions);
  handle(key('E', { shiftKey: true }));
  handle(key('?', { shiftKey: true }));
  assert.deepEqual(calls, ['archiveAndNext', 'openShortcutHelp']);
});

test('ctrl+k opens the command palette', () => {
  const { calls, actions } = recorder();
  const handle = createShortcuts(actions);
  handle(key('k', { ctrlKey: true }));
  assert.deepEqual(calls, ['openCommandPalette']);
});

test('escape closes the compose window', () => {
  const { calls, actions } = recorder();
  const handle = createShortcuts(actions);
  handle(key('Escape'));
  assert.deepEqual(calls, ['closeCompose']);
});

test('unbound keys are ignored', () => {
  const { calls, actions } = recorder();
  const handle = createShortcuts(actions);
  assert.equal(handle(key('q')), false);
  assert.deepEqual(calls, []);
});
