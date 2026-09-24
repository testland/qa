import test from 'node:test';
import assert from 'node:assert/strict';
import { createCombobox, typeChar, keyDown, results, render } from '../src/combobox.js';

const PRODUCTS = [
  { id: 'p1', name: 'Shelf bracket' },
  { id: 'p2', name: 'Shelving unit' },
  { id: 'p3', name: 'Shed door hinge' },
  { id: 'p4', name: 'Garden spade' },
];

const typed = (state, text) => [...text].reduce((s, c) => typeChar(s, c), state);

test('results filter on a substring of the name', () => {
  const state = typed(createCombobox(PRODUCTS), 'shel');
  assert.deepEqual(results(state).map((p) => p.id), ['p1', 'p2']);
});

test('an empty query returns nothing and the list stays closed', () => {
  const state = createCombobox(PRODUCTS);
  assert.equal(results(state).length, 0);
  assert.equal(render(state).listbox.hidden, true);
});

test('typing opens the list', () => {
  const state = typed(createCombobox(PRODUCTS), 'she');
  assert.equal(state.open, true);
  assert.equal(render(state).options.length, 3);
});

test('Escape closes the list, and Escape again clears the field', () => {
  let state = typed(createCombobox(PRODUCTS), 'she');
  state = keyDown(state, 'Escape');
  assert.equal(state.open, false);
  state = keyDown(state, 'Escape');
  assert.equal(state.query, '');
});

test('arrowing down marks the first result as the selected option', () => {
  const state = keyDown(typed(createCombobox(PRODUCTS), 'shel'), 'ArrowDown');
  const rendered = render(state);
  assert.equal(rendered.options[0]['aria-selected'], 'true');
  assert.equal(rendered.options[1]['aria-selected'], 'false');
});

test('the list takes over once the user arrows into it', () => {
  let state = keyDown(typed(createCombobox(PRODUCTS), 'shel'), 'ArrowDown');
  state = typeChar(state, 'f');
  assert.equal(state.query, 'shel');
  assert.equal(state.domFocus, 'site-search-listbox');
});
