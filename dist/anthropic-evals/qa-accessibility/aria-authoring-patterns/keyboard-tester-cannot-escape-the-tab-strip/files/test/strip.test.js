import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createStrip,
  pointerEnter,
  pointerLeave,
  stripKeyDown,
  hintTimeout,
  renderStrip,
} from '../src/strip.js';

test('the strip renders one button per action', () => {
  const rendered = renderStrip(createStrip());
  assert.equal(rendered.buttons.length, 6);
  assert.ok(rendered.buttons.every((b) => b.tabindex === '0'));
});

test('no hint is showing before the pointer arrives', () => {
  const rendered = renderStrip(createStrip());
  assert.equal(rendered.hints.filter((h) => !h.hidden).length, 0);
});

test('the pointer reveals the hint belonging to that button', () => {
  const rendered = renderStrip(pointerEnter(createStrip(), 'export'));
  const shown = rendered.hints.filter((h) => !h.hidden);
  assert.equal(shown.length, 1);
  assert.equal(shown[0].id, 'hint-export');
  assert.equal(shown[0].text, 'Download the current view as CSV.');
  assert.equal(shown[0]['aria-live'], 'assertive');
});

test('taking the pointer away puts the hint back', () => {
  const state = pointerLeave(pointerEnter(createStrip(), 'export'));
  assert.equal(renderStrip(state).hints.filter((h) => !h.hidden).length, 0);
});

test('an open hint takes itself away after three seconds', () => {
  const open = pointerEnter(createStrip(), 'columns');
  assert.deepEqual(hintTimeout(open), { afterMs: 3000, then: 'hide' });
  assert.equal(hintTimeout(createStrip()), null);
});

test('Enter and Space on a button do not change what is showing', () => {
  const state = pointerEnter(createStrip(), 'filter');
  assert.equal(stripKeyDown(state, 'Enter').openHint, 'filter');
  assert.equal(stripKeyDown(state, ' ').openHint, 'filter');
});
