const ACTIONS = [
  { id: 'refresh', label: 'Refresh', hint: 'Reload this list from the server.' },
  { id: 'filter', label: 'Filter', hint: 'Narrow the list by owner, status or date added.' },
  { id: 'columns', label: 'Columns', hint: 'Choose which columns appear and in what order. Hidden columns are still included in an export.' },
  { id: 'export', label: 'Export', hint: 'Download the current view as CSV.' },
  { id: 'share', label: 'Share', hint: 'Invite people to this view.' },
  { id: 'archive', label: 'Archive', hint: 'Move this view to the archive. You can restore it later.' },
];

export function createStrip(items = ACTIONS) {
  return { items, openHint: null };
}

export function pointerEnter(state, id) {
  return { ...state, openHint: id };
}

export function pointerLeave(state) {
  return { ...state, openHint: null };
}

export function stripKeyDown(state, key) {
  if (key === 'Enter' || key === ' ') return state;
  return state;
}

export function hintTimeout(state) {
  return state.openHint ? { afterMs: 3000, then: 'hide' } : null;
}

export function renderStrip(state) {
  return {
    bar: { id: 'view-actions', tag: 'div', 'aria-label': 'View actions' },
    buttons: state.items.map((a) => ({
      id: 'act-' + a.id,
      tag: 'button',
      tabindex: '0',
      text: '',
      icon: { tag: 'svg', 'aria-hidden': 'true', focusable: 'false' },
      'aria-describedby': 'hint-' + a.id,
    })),
    hints: state.items.map((a) => ({
      id: 'hint-' + a.id,
      role: 'tooltip',
      'aria-live': 'assertive',
      hidden: state.openHint !== a.id,
      text: a.hint,
    })),
  };
}
