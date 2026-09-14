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
