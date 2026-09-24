import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTabs } from '../src/tabs.js';

const LABELS = [
  'Overview',
  'Traffic',
  'Conversions',
  'Cohorts',
  'Revenue',
  'Funnels',
  'Exports',
];

function press(tabs, key) {
  const event = {
    key,
    shiftKey: false,
    ctrlKey: false,
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
  };
  tabs.handleKeydown(event);
  return event;
}

test('right arrow selects the next tab', () => {
  const tabs = createTabs(LABELS);
  press(tabs, 'ArrowRight');
  assert.equal(tabs.state.activeIndex, 1);
  assert.equal(tabs.attrsFor(1)['aria-selected'], 'true');
  assert.equal(tabs.attrsFor(0)['aria-selected'], 'false');
});

test('left arrow selects the previous tab', () => {
  const tabs = createTabs(LABELS);
  press(tabs, 'ArrowRight');
  press(tabs, 'ArrowRight');
  press(tabs, 'ArrowLeft');
  assert.equal(tabs.state.activeIndex, 1);
});

test('home and end jump to the ends of the strip', () => {
  const tabs = createTabs(LABELS);
  press(tabs, 'End');
  assert.equal(tabs.state.activeIndex, 6);
  press(tabs, 'Home');
  assert.equal(tabs.state.activeIndex, 0);
});

test('only the selected tab sits in the page tab sequence', () => {
  const tabs = createTabs(LABELS);
  press(tabs, 'ArrowRight');
  assert.equal(tabs.attrsFor(1).tabindex, '0');
  assert.deepEqual(
    [0, 2, 3, 4, 5, 6].map((i) => tabs.attrsFor(i).tabindex),
    ['-1', '-1', '-1', '-1', '-1', '-1'],
  );
});

test('the selected panel is the only one shown', () => {
  const tabs = createTabs(LABELS);
  press(tabs, 'ArrowRight');
  assert.equal(tabs.panelAttrsFor(1).hidden, false);
  assert.equal(tabs.panelAttrsFor(0).hidden, true);
});

test('every tab points at its panel', () => {
  const tabs = createTabs(LABELS);
  for (let i = 0; i < LABELS.length; i++) {
    assert.equal(tabs.attrsFor(i)['aria-controls'], tabs.panelId(i));
    assert.equal(tabs.panelAttrsFor(i)['aria-labelledby'], tabs.tabId(i));
  }
});

test('the strip keeps tab from walking from tab to tab', () => {
  const tabs = createTabs(LABELS);
  const event = press(tabs, 'Tab');
  assert.equal(event.defaultPrevented, true);
});

test('the strip starts with the reader on the first tab', () => {
  const tabs = createTabs(LABELS);
  assert.equal(tabs.state.focusTargetId, tabs.tabId(0));
});
