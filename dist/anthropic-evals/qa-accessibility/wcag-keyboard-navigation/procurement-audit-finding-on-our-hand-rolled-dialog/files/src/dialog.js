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
