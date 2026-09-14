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
  return tabs.handleKeydown({ key, shiftKey: false, ctrlKey: false });
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
