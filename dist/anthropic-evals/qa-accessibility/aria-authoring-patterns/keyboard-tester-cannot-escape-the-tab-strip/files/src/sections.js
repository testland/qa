const SECTIONS = ['general', 'privacy', 'members', 'billing', 'integrations', 'advanced'];

export function createSections(ids = SECTIONS) {
  return { ids, selected: ids[0] };
}

export function selectSection(state, id) {
  if (!state.ids.includes(id)) return state;
  return { ...state, selected: id };
}

export function sectionKeyDown(state, key) {
  if (key === 'Enter' || key === ' ') return state;
  return state;
}

export function renderSections(state) {
  return {
    list: { id: 'settings-tablist', role: 'tablist', 'aria-label': 'Workspace settings' },
    tabs: state.ids.map((id, i) => ({
      id: 'tab-' + id,
      role: 'tab',
      'aria-selected': id === state.selected ? 'true' : 'false',
      'aria-controls': 'panel-' + id,
      tabindex: i === 3 ? '3' : '0',
      text: id[0].toUpperCase() + id.slice(1),
    })),
    extras: [
      { id: 'customize', tag: 'button', tabindex: '0', text: 'Customize' },
    ],
    panels: state.ids.map((id) => ({
      id: 'panel-' + id,
      role: 'tabpanel',
      hidden: id !== state.selected,
    })),
  };
}
