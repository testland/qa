# Mail threads are archiving themselves for one of our Dragon customers

## Problem Description

We shipped the power-user key bindings in the inbox rewrite six weeks ago:
`/` jumps to search, `j` / `k` walk the thread list, `e` archives the open
thread, `x` toggles the row checkbox, `u` goes back to the list. The command
palette on `Ctrl+K` (`Cmd+K` on Mac) has been in the product since March and
nobody has complained about it.

Ticket #8814 came in on Tuesday from Aldermoor Legal, who have four staff on
Dragon speech-input because of RSI. One of them has had eleven threads archived
over two weeks that she says she never archived, and twice the whole list
jumped to search mid-dictation. She is not making it up — she dictates replies
into the compose box and the dictation software emits keystrokes that our
handler treats as commands. Her workaround right now is to not use the product
with her hands off the keyboard, which is the entire reason she bought it.

We are also two weeks out from a WCAG 2.2 AA conformance statement for a
county-government renewal, so whatever we do here has to be the thing an
auditor expects to see, not a patch that happens to stop this one customer's
complaint.

Our head of legal read the ticket and asked us to "put a user-facing off
switch on every shortcut in the product, including the command palette, so we
can say we did." I would rather ship what the standard actually requires than
bolt switches onto things that do not need them — tell me which of these
bindings genuinely needs treatment and which does not, and say why.

The handler and its tests are attached. The suite is green today.

## Output Specification

1. Change `src/shortcuts.js` so the bindings that need it conform. Keep the
   existing exported function signature — other modules import it.
2. Add tests to `test/shortcuts.test.js` that fail against the current handler
   and pass against yours. The suite must stay runnable with `node --test`.
3. Write `docs/shortcut-conformance.md`: one row per binding, what treatment it
   got or why it needs none, and what an auditor would check to confirm it.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "inbox-shortcuts",
  "version": "2.4.0",
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/shortcuts.js ===============
const BINDINGS = {
  '/': 'focusSearch',
  j: 'nextThread',
  k: 'prevThread',
  e: 'archiveThread',
  x: 'toggleSelect',
  u: 'backToList',
};

export function createShortcuts(actions) {
  return function handleKeydown(event) {
    if (event.ctrlKey || event.metaKey) {
      if (event.key === 'k') {
        actions.openCommandPalette();
        return true;
      }
      return false;
    }

    const action = BINDINGS[event.key];
    if (!action) return false;

    actions[action]();
    return true;
  };
}

=============== FILE: test/shortcuts.test.js ===============
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createShortcuts } from '../src/shortcuts.js';

const ACTION_NAMES = [
  'focusSearch',
  'nextThread',
  'prevThread',
  'archiveThread',
  'toggleSelect',
  'backToList',
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

test('ctrl+k opens the command palette', () => {
  const { calls, actions } = recorder();
  const handle = createShortcuts(actions);
  handle(key('k', { ctrlKey: true }));
  assert.deepEqual(calls, ['openCommandPalette']);
});

test('unbound keys are ignored', () => {
  const { calls, actions } = recorder();
  const handle = createShortcuts(actions);
  assert.equal(handle(key('q')), false);
  assert.deepEqual(calls, []);
});

=============== FILE: docs/ticket-8814.md ===============
# Ticket #8814 — Aldermoor Legal (Enterprise, renewal 2026-11-02)

Reporter: account admin, relaying for 4 users on Dragon Professional.

> Three of us dictate. Since the update, mail disappears while we talk. One of
> my associates lost eleven threads into the archive over a fortnight — they
> were all recoverable from All Mail but she did not know that for nine days.
> Twice the screen jumped to the search field in the middle of a sentence.
> We have turned off dictation inside your app, which rather defeats it.

Support notes:

- Reproduced in-house with Dragon 16: dictating "everything's fine" into the
  compose box emitted `e` before the compose field took focus on a slow render,
  and the open thread archived.
- Reproduced with Windows Speech Recognition: dictated punctuation emitted `/`
  outside a text field; the search box took focus.
- The command palette has never appeared in any of these reports.
- No preferences UI exists for key bindings today. The settings page has a
  "Keyboard" section with nothing in it but a link to the help article.
