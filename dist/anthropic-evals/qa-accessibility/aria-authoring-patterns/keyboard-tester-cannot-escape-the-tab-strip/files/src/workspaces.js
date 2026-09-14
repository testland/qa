const WORKSPACES = [
  { slug: 'acme', name: 'Acme' },
  { slug: 'barrow', name: 'Barrow' },
  { slug: 'cohen', name: 'Cohen' },
  { slug: 'delta', name: 'Delta' },
  { slug: 'evered', name: 'Evered' },
  { slug: 'foxglove', name: 'Foxglove' },
];

export function createSwitcher(currentSlug, items = WORKSPACES) {
  return { items, current: currentSlug };
}

export function switcherKeyDown(state, key) {
  if (key === 'Enter') return state;
  return state;
}

export function renderSwitcher(state) {
  return {
    list: { id: 'workspace-switcher', tag: 'ul', 'aria-label': 'Workspaces' },
    items: state.items.map((w) => ({
      id: 'ws-' + w.slug,
      tag: 'a',
      href: '/w/' + w.slug,
      'aria-selected': w.slug === state.current ? 'true' : 'false',
      text: w.name,
    })),
  };
}
