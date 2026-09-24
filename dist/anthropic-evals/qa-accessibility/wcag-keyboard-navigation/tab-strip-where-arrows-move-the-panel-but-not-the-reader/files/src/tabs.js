export function createTabs(labels) {
  const state = {
    labels,
    activeIndex: 0,
    focusTargetId: 'tab-0',
  };

  function tabId(index) {
    return `tab-${index}`;
  }

  function panelId(index) {
    return `panel-${index}`;
  }

  function attrsFor(index) {
    return {
      id: tabId(index),
      role: 'tab',
      tabindex: index === state.activeIndex ? '0' : '-1',
      'aria-selected': index === state.activeIndex ? 'true' : 'false',
      'aria-controls': panelId(index),
    };
  }

  function panelAttrsFor(index) {
    return {
      id: panelId(index),
      role: 'tabpanel',
      tabindex: '0',
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
    // The strip is a single tab stop, so Tab must not walk from tab to tab.
    if (event.key === 'Tab') {
      event.preventDefault();
      return true;
    }
    if (event.key === 'ArrowRight') return select(state.activeIndex + 1);
    if (event.key === 'ArrowLeft') return select(state.activeIndex - 1);
    if (event.key === 'Home') return select(0);
    if (event.key === 'End') return select(state.labels.length - 1);
    return false;
  }

  return { state, attrsFor, panelAttrsFor, handleKeydown, select, tabId, panelId };
}
