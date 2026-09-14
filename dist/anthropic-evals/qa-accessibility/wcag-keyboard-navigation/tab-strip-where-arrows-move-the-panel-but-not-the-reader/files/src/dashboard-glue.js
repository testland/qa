import { createTabs } from './tabs.js';

// Each dashboard mounts the strip the same way: re-render, then put the reader
// wherever the module says it belongs.
export function mountTabs(root, labels, render) {
  const tabs = createTabs(labels);

  root.querySelector('[role="tablist"]').addEventListener('keydown', (event) => {
    tabs.handleKeydown(event);
    render(tabs);
    root.ownerDocument.getElementById(tabs.state.focusTargetId)?.focus();
  });

  render(tabs);
  return tabs;
}
