import test from 'node:test';
import assert from 'node:assert/strict';
import {
  attrsFor,
  renderCollapsible,
  renderCounter,
  renderMenuTrigger,
  renderToggle,
  renderHint,
} from '../src/render.js';

test('collapsible pins its token semantics', () => {
  const closed = renderCollapsible(false, 'shipping-region');
  assert.equal(closed.trigger.role, 'button');
  assert.equal(closed.trigger['aria-pressed'], 'false');
  assert.equal(closed.trigger['aria-controls'], 'shipping-region');
  assert.equal(closed.region.hidden, true);
  assert.equal(renderCollapsible(true, 'shipping-region').trigger['aria-pressed'], 'true');
});

test('counter pins its token semantics', () => {
  const rendered = renderCounter(3);
  assert.equal(rendered.field.role, 'spinbutton');
  assert.equal(rendered.field['aria-valuenow'], '3');
  assert.equal(rendered.field.text, '3');
  assert.equal(rendered.field.tabindex, undefined);
});

test('menu trigger pins its token semantics', () => {
  const rendered = renderMenuTrigger(true, 'account-menu');
  assert.equal(rendered.trigger.role, 'menu');
  assert.equal(rendered.trigger['aria-expanded'], 'true');
  assert.equal(rendered.menu.items.length, 3);
  assert.equal(rendered.menu.items[0].link.href, '/profile');
});

test('toggle pins its token semantics', () => {
  assert.equal(renderToggle(true).control.role, 'switch');
  assert.equal(renderToggle(true).control['aria-checked'], 'true');
  assert.equal(renderToggle(false).control['aria-checked'], 'false');
});

test('hint pins its token semantics', () => {
  const rendered = renderHint('save-hint', 'Saves without leaving the page');
  assert.equal(rendered.bubble.role, 'tooltip');
  assert.equal(rendered.bubble.hidden, true);
  assert.equal(rendered.trigger.text, 'Save');
  assert.equal(rendered.trigger['aria-describedby'], undefined);
});

test('an unknown component is a hard error', () => {
  assert.throws(() => attrsFor('carousel'), /unknown component/);
});
