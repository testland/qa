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
