const MAX_RESULTS = 8;

export function createCombobox(products) {
  return { products, query: '', open: false, activeIndex: -1, domFocus: 'site-search' };
}

export function results(state) {
  if (!state.query) return [];
  const q = state.query.toLowerCase();
  return state.products.filter((p) => p.name.toLowerCase().includes(q)).slice(0, MAX_RESULTS);
}

export function typeChar(state, char) {
  // Keystrokes arrive at whatever element currently holds focus.
  if (state.domFocus !== 'site-search') return state;
  return { ...state, query: state.query + char, open: true, activeIndex: -1 };
}

export function keyDown(state, key) {
  const list = results(state);
  if (key === 'ArrowDown' && list.length) {
    const i = Math.min(state.activeIndex + 1, list.length - 1);
    return { ...state, open: true, activeIndex: i, domFocus: 'site-search-listbox' };
  }
  if (key === 'ArrowUp' && list.length) {
    const i = Math.max(state.activeIndex - 1, 0);
    return { ...state, activeIndex: i, domFocus: 'site-search-listbox' };
  }
  if (key === 'Escape' && state.open) {
    return { ...state, open: false, activeIndex: -1, domFocus: 'site-search' };
  }
  if (key === 'Escape') {
    return { ...state, query: '', activeIndex: -1, domFocus: 'site-search' };
  }
  return state;
}

export function render(state) {
  const list = results(state);
  return {
    wrapper: { class: 'site-search', 'aria-expanded': state.open ? 'true' : 'false' },
    input: {
      id: 'site-search',
      role: 'combobox',
      'aria-controls': 'site-search-listbox',
      'aria-autocomplete': 'list',
      value: state.query,
    },
    clear: { id: 'site-search-clear', tag: 'button', tabindex: '-1', 'aria-hidden': 'true', text: 'x' },
    listbox: {
      id: 'site-search-listbox',
      role: 'listbox',
      hidden: !state.open,
      'aria-activedescendant': state.activeIndex >= 0 ? 'option-' + list[state.activeIndex].id : '',
    },
    options: list.map((p, i) => ({
      id: 'opt-' + p.id,
      role: 'option',
      'aria-selected': i === state.activeIndex ? 'true' : 'false',
      text: p.name,
    })),
  };
}
