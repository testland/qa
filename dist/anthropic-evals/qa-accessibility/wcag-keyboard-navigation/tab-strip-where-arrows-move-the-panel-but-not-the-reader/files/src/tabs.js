export function createTabs(labels) {
  const state = {
    labels,
    activeIndex: 0,
    focusedElementId: null,
  };

  function tabId(index) {
    return `tab-${index}`;
  }

  function panelId(index) {
    return `panel-${index}`;
  }

  // Attributes rendered onto each tab button.
  function attrsFor(index) {
    return {
      id: tabId(index),
      role: 'tab',
      tabindex: '0',
      'aria-selected': index === state.activeIndex ? 'true' : 'false',
      'aria-controls': panelId(index),
    };
  }

  function panelAttrsFor(index) {
    return {
      id: panelId(index),
      role: 'tabpanel',
      'aria-labelledby': tabId(index),
      hidden: index !== state.activeIndex,
    };
  }

  function select(index) {
    if (index < 0 || index >= state.labels.length) return false;
    state.activeIndex = index;
    return true;
  }

  function handleKeydown(event) {
    if (event.key === 'ArrowRight') {
      return select(state.activeIndex + 1);
    }
    if (event.key === 'ArrowLeft') {
      return select(state.activeIndex - 1);
    }
    return false;
  }

  return { state, attrsFor, panelAttrsFor, handleKeydown, select, tabId, panelId };
}
