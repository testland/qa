import test from 'node:test';
import assert from 'node:assert/strict';
import { createSections, selectSection, sectionKeyDown, renderSections } from '../src/sections.js';

test('the first section is selected on load', () => {
  const rendered = renderSections(createSections());
  assert.equal(rendered.tabs[0]['aria-selected'], 'true');
  assert.equal(rendered.tabs.filter((t) => t['aria-selected'] === 'true').length, 1);
});

test('selecting a section reveals its panel and hides the others', () => {
  const rendered = renderSections(selectSection(createSections(), 'billing'));
  const visible = rendered.panels.filter((p) => !p.hidden);
  assert.equal(visible.length, 1);
  assert.equal(visible[0].id, 'panel-billing');
});

test('an unknown section id is ignored', () => {
  const state = selectSection(createSections(), 'nope');
  assert.equal(state.selected, 'general');
});

test('every section is reachable with Tab', () => {
  const rendered = renderSections(createSections());
  const reachable = rendered.tabs.filter((t) => t.tabindex !== '-1');
  assert.equal(reachable.length, 6);
});

test('Enter on a section does not change the selection', () => {
  const state = createSections();
  assert.equal(sectionKeyDown(state, 'Enter').selected, state.selected);
});
