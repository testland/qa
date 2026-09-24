# Remediating audit finding 17 on the board dialogs before the 30th

## Problem Description

Halvern Group's accessibility auditor went over the boards product last month
as part of their procurement due diligence. Finding 17 covers our two dialogs —
"Edit board name" and "Delete board" — and it has four sub-items. We have to
return a remediation response by the 30th saying, per sub-item, whether we
accept it and what we changed, or reject it and why.

Two things make this harder than it should be. The dialogs are hand-rolled —
they predate the design system and three teams import the module, so I cannot
swap them wholesale this week. And the auditor's sub-items are written against
their own house checklist rather than against the standard, with the checklist
item number quoted in two of them.

Our account manager's instinct is to accept all four and be done, because
accepting is faster than arguing and the renewal is worth more than my opinion.
I would rather we return something correct, because whatever we accept we then
have to ship, and the two dialogs do not behave the same way on purpose — look
at the config before you decide they should.

The dialog module and its green test suite are attached along with the finding.

## Output Specification

1. Fix `src/dialog.js` for whatever sub-items you accept. The exported surface
   is imported by three teams — keep the function names and their shapes.
2. Add cases to `test/dialog.test.js` that are red against the module as
   supplied and green afterwards. The suite must keep running under `node --test`.
3. Write `docs/finding-17-response.md`: one section per sub-item V-1..V-4, each
   marked accepted or rejected, with the reason and what changed.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "boards-dialog",
  "version": "3.1.7",
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/dialog.js ===============
export const FOCUSABLE_TAGS = new Set(['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA']);

export const DIALOGS = {
  'edit-board-name': {
    destructive: false,
    closeOnEscape: false,
    closeOnOverlayClick: true,
  },
  'confirm-delete-board': {
    destructive: true,
    closeOnEscape: false,
    closeOnOverlayClick: false,
  },
};

export function dialogAttrs(dialogId, titleId) {
  return {
    id: dialogId,
    role: 'dialog',
    'aria-modal': 'true',
    tabindex: '-1',
    'aria-labelledby': titleId,
  };
}

export function focusableIn(container) {
  return container.children.filter(
    (el) => (FOCUSABLE_TAGS.has(el.tag) || el.tabindex === 0) && !el.disabled && !el.hidden,
  );
}

export function nextFocusIndex(focusables, currentIndex, event) {
  if (event.key !== 'Tab') return null;
  if (event.shiftKey) return currentIndex === 0 ? focusables.length - 1 : null;
  return currentIndex === focusables.length - 1 ? 0 : null;
}

// The dialog is rendered into the dialog layer, which is a child of the page root.
export function pageTree(dialogContainer) {
  return {
    id: 'app-root',
    tag: 'DIV',
    attrs: {},
    children: [
      { id: 'app-main', tag: 'MAIN', attrs: {}, children: [] },
      { id: 'app-sidebar', tag: 'NAV', attrs: {}, children: [] },
      {
        id: 'dialog-layer',
        tag: 'DIV',
        attrs: {},
        children: dialogContainer ? [dialogContainer] : [],
      },
    ],
  };
}

export function openDialog(state, dialogId, trigger, pageRoot) {
  state.openDialogId = dialogId;
  state.trigger = trigger;
  trigger.attrs['aria-hidden'] = 'true';
  pageRoot.attrs['aria-hidden'] = 'true';
  return state;
}

export function closeDialog(state, pageRoot) {
  const trigger = state.trigger;
  delete trigger.attrs['aria-hidden'];
  delete pageRoot.attrs['aria-hidden'];
  state.openDialogId = null;
  state.trigger = null;
  return trigger;
}

export function handleKeydown(state, event) {
  if (event.key === 'Tab') return { action: 'tab' };
  return { action: 'none' };
}

export function handleOverlayClick(state) {
  const config = DIALOGS[state.openDialogId];
  return config.closeOnOverlayClick ? { action: 'close' } : { action: 'none' };
}

export function newState() {
  return { openDialogId: null, trigger: null };
}

=============== FILE: test/dialog.test.js ===============
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  closeDialog,
  dialogAttrs,
  focusableIn,
  handleOverlayClick,
  newState,
  nextFocusIndex,
  openDialog,
  pageTree,
} from '../src/dialog.js';

function el(id, tag, extra = {}) {
  return { id, tag, disabled: false, hidden: false, tabindex: null, attrs: {}, ...extra };
}

function editDialogContainer() {
  return {
    id: 'edit-board-name',
    attrs: {},
    children: [
      el('board-name-input', 'INPUT'),
      el('cancel', 'BUTTON'),
      el('save', 'BUTTON'),
    ],
  };
}

function deleteDialogContainer() {
  return {
    id: 'confirm-delete-board',
    attrs: {},
    children: [
      el('confirm-name-input', 'INPUT'),
      el('restore-from-trash', 'A', { hidden: true }),
      el('cancel', 'BUTTON'),
      el('delete-permanently', 'BUTTON', { disabled: true }),
    ],
  };
}

test('focusable children of the edit dialog are found in order', () => {
  const found = focusableIn(editDialogContainer()).map((e) => e.id);
  assert.deepEqual(found, ['board-name-input', 'cancel', 'save']);
});

test('controls that cannot be activated are left out of the cycle', () => {
  const found = focusableIn(deleteDialogContainer()).map((e) => e.id);
  assert.deepEqual(found, ['confirm-name-input', 'cancel']);
});

test('tab from the last control wraps to the first, and back again', () => {
  const f = focusableIn(editDialogContainer());
  assert.equal(nextFocusIndex(f, f.length - 1, { key: 'Tab', shiftKey: false }), 0);
  assert.equal(nextFocusIndex(f, 0, { key: 'Tab', shiftKey: true }), f.length - 1);
});

test('keys other than tab are not handled by the cycle', () => {
  const f = focusableIn(editDialogContainer());
  assert.equal(nextFocusIndex(f, 1, { key: 'ArrowDown', shiftKey: false }), null);
});

test('the dialog renders inside the page container', () => {
  const tree = pageTree(editDialogContainer());
  assert.deepEqual(tree.children.map((c) => c.id), ['app-main', 'app-sidebar', 'dialog-layer']);
  assert.equal(tree.children[2].children[0].id, 'edit-board-name');
});

test('closing returns the element that opened the dialog', () => {
  const state = newState();
  const trigger = el('rename-board-btn', 'BUTTON');
  const tree = pageTree(editDialogContainer());
  openDialog(state, 'edit-board-name', trigger, tree);
  const restored = closeDialog(state, tree);
  assert.equal(restored.id, 'rename-board-btn');
  assert.equal(state.openDialogId, null);
  assert.equal(trigger.attrs['aria-hidden'], undefined);
});

test('the delete confirmation ignores clicks on the overlay', () => {
  const state = newState();
  openDialog(state, 'confirm-delete-board', el('delete-board-btn', 'BUTTON'), pageTree(null));
  assert.deepEqual(handleOverlayClick(state), { action: 'none' });
});

test('the dialog container is labelled by its heading and declares itself modal', () => {
  const attrs = dialogAttrs('edit-board-name', 'edit-board-title');
  assert.equal(attrs['aria-labelledby'], 'edit-board-title');
  assert.equal(attrs['aria-modal'], 'true');
});

=============== FILE: audit/finding-17.md ===============
# Finding 17 — modal dialogs — Halvern Group, 2026-08-28

Scope: `Edit board name` dialog and `Delete board` confirmation, boards
product, web. Severity: high. Response due 2026-09-30.

## V-1 — Focus stays where it was when the dialog opens

Observed: activating either trigger displays the dialog but leaves focus on the
page behind it. A screen-reader user is not told the dialog is there and has to
hunt for it; a sighted keyboard user Tabs through the page underneath first.

## V-2 — Neither dialog closes with the Escape key

Observed: Escape has no effect on either dialog. Users familiar with the
convention report the dialog as frozen.

## V-3 — The launching control is not hidden from assistive technology

Per our house checklist item A-9, the control that opened the dialog, and the
page container behind it, must be marked `aria-hidden="true"` for the duration
that the dialog is displayed, so that assistive technology cannot reach the
background. Confirm this is in place.

## V-4 — Dismissal behaviour is inconsistent between the two dialogs

Observed: the `Edit board name` dialog closes when the overlay behind it is
clicked. The `Delete board` confirmation does not. Per our house checklist item
A-14, overlay dismissal is recommended practice and should be consistent across
a product's dialogs. Confirm the same behaviour on the `Delete board`
confirmation.
