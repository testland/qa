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
