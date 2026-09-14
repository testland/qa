const byName = (a, b) => a.name.localeCompare(b.name);

export function createAssignees(people) {
  return { people: [...people].sort(byName), selected: new Set(), activeIndex: 0 };
}

export function keyDown(state, key) {
  if (key === 'ArrowDown') {
    return { ...state, activeIndex: Math.min(state.activeIndex + 1, state.people.length - 1) };
  }
  if (key === 'ArrowUp') {
    return { ...state, activeIndex: Math.max(state.activeIndex - 1, 0) };
  }
  return state;
}

export function toggleActive(state) {
  const id = state.people[state.activeIndex].id;
  const selected = new Set(state.selected);
  if (selected.has(id)) selected.delete(id);
  else selected.add(id);
  return { ...state, selected };
}

export function renderAssignees(state) {
  return {
    container: { id: 'assignees', class: 'assignee-list' },
    rows: state.people.map((person, i) => ({
      id: 'assignee-' + person.id,
      class: i === state.activeIndex ? 'row is-active' : 'row',
      'data-selected': state.selected.has(person.id) ? 'true' : 'false',
      avatar: person.avatar,
      text: person.name + ' - ' + person.openTasks + ' open tasks',
    })),
  };
}
