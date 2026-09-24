const BINDINGS = {
  '/': 'focusSearch',
  j: 'nextThread',
  k: 'prevThread',
  e: 'archiveThread',
  E: 'archiveAndNext',
  x: 'toggleSelect',
  u: 'backToList',
  '?': 'openShortcutHelp',
};

export function createShortcuts(actions) {
  return function handleKeydown(event) {
    if (event.key === 'Escape') {
      actions.closeCompose();
      return true;
    }

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
