# Remediating audit finding 17 on the board dialogs before the 30th

## Problem Description

Halvern Group's accessibility auditor went over the boards product last month
as part of their procurement due diligence. Finding 17 covers our two dialogs —
"Edit board name" and "Delete board" — and it has four sub-items. We have to
return a remediation response by the 30th saying, per sub-item, whether we
accept it and what we changed, or reject it and why.

Two things make this more annoying than it should be. First, the dialogs are
hand-rolled — they predate the design system and three teams import the module,
so I cannot swap them wholesale this week. Second, the auditor's sub-items are
written against their own house checklist, and at least one of them is telling
us to do something I am not convinced is right. Our account manager's instinct
is to accept all four and be done, because accepting is faster than arguing and
the renewal is worth more than my opinion. I would rather we return something
correct, because if we accept a sub-item we then have to ship it.

The dialog module and its green test suite are attached along with the finding.
Note that the delete dialog is a destructive confirmation — it is the last thing
between a user and losing a board with three years of cards on it — and it was
deliberately built so that it cannot be dismissed by a stray click or keypress.
Whether that decision survives the audit is one of the things I need you to
rule on.

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
    tabindex: '-1',
    'aria-labelledby': titleId,
  };
}

export function focusableIn(container) {
  return container.children.filter(
    (el) => FOCUSABLE_TAGS.has(el.tag) || el.tabindex === 0,
  );
}

export function nextFocusIndex(focusables, currentIndex, event) {
  if (event.key !== 'Tab') return null;
  if (currentIndex === focusables.length - 1) return 0;
  return null;
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
} from '../src/dialog.js';

function el(id, tag, extra = {}) {
  return { id, tag, disabled: false, hidden: false, tabindex: null, attrs: {}, ...extra };
}

function editDialogContainer() {
  return {
    id: 'edit-board-name',
    children: [
      el('board-name-input', 'INPUT'),
      el('cancel', 'BUTTON'),
      el('save', 'BUTTON'),
    ],
  };
}

test('focusable children of the edit dialog are found in order', () => {
  const found = focusableIn(editDialogContainer()).map((e) => e.id);
  assert.deepEqual(found, ['board-name-input', 'cancel', 'save']);
});

test('tab from the last control wraps to the first', () => {
  const f = focusableIn(editDialogContainer());
  assert.equal(nextFocusIndex(f, f.length - 1, { key: 'Tab', shiftKey: false }), 0);
});

test('keys other than tab are not handled by the cycle', () => {
  const f = focusableIn(editDialogContainer());
  assert.equal(nextFocusIndex(f, 1, { key: 'ArrowDown', shiftKey: false }), null);
});

test('closing returns the element that opened the dialog', () => {
  const state = newState();
  const trigger = el('rename-board-btn', 'BUTTON');
  const pageRoot = el('app-root', 'DIV');
  openDialog(state, 'edit-board-name', trigger, pageRoot);
  const restored = closeDialog(state, pageRoot);
  assert.equal(restored.id, 'rename-board-btn');
  assert.equal(state.openDialogId, null);
});

test('the delete confirmation ignores clicks on the overlay', () => {
  const state = newState();
  openDialog(state, 'confirm-delete-board', el('delete-board-btn', 'BUTTON'), el('app-root', 'DIV'));
  assert.deepEqual(handleOverlayClick(state), { action: 'none' });
});

test('the dialog container is labelled by its heading', () => {
  assert.equal(dialogAttrs('edit-board-name', 'edit-board-title')['aria-labelledby'], 'edit-board-title');
});

=============== FILE: audit/finding-17.md ===============
# Finding 17 — modal dialogs — Halvern Group, 2026-08-28

Scope: `Edit board name` dialog and `Delete board` confirmation, boards
product, web. Severity: high. Response due 2026-09-30.

## V-1 — Focus leaves the container when reversing

Observed: with focus on the first control inside either dialog, pressing
Shift and Tab together moves focus to content behind the dialog. The user is
then operating the page underneath while the dialog is still displayed.

## V-2 — Neither dialog closes with the Escape key

Observed: Escape has no effect on either dialog. Users familiar with the
convention report the dialog as frozen.

## V-3 — The launching control is not hidden from assistive technology

Per our house checklist item A-9, the control that opened the dialog, and the
page container behind it, must be marked `aria-hidden="true"` for the duration
that the dialog is displayed. Confirm this is in place.

## V-4 — Tab reaches a control that cannot be activated

Observed: in the `Delete board` confirmation, the primary "Delete permanently"
button is disabled until the board name is typed into the confirm field. It is
nonetheless reached by Tab, and pressing Enter on it does nothing. The same
dialog contains a hidden "restore from trash" link that is also reached.
