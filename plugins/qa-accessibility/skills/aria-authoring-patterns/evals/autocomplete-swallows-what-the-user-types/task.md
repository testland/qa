# Search box "stops accepting typing" - 40-odd tickets since the redesign

## Problem Description

Support has 43 tickets on the storefront search box since the July redesign,
all the same shape. Customer types "shel", presses the down arrow to look at
the suggestions, then keeps typing to narrow it further and nothing happens —
the field is stuck on "shel" and the extra characters go nowhere. They have to
click back into the field with the mouse before it wakes up. One ticket from a
customer who uses a switch device says he cannot get back into the field at
all.

Separately, the accessibility contractor we hired for two days in August left a
one-line note on the ticket: the widget "announces nothing at all while the
user is arrowing through the suggestions". She did not get as far as saying
why, and her engagement ended the same week.

Priya (PM) added two things to the ticket before assigning it:

- "While you are in there, put an aria-label on the search field and on every
  result row so the screen reader has something to read out. Cheap win, and we
  get to control the wording."
- "Do not touch the little x clear button. We deliberately hid it from screen
  readers back in June because it is only a shortcut and it was making the
  announcements noisy. That one is intentional."

The widget is `src/combobox.js`, the markup it renders into is
`src/search.html`, and `npm test` is green today.

## Output Specification

1. Fix `src/combobox.js`.
2. Add at least one test to `test/combobox.test.js` that fails against today's
   code and passes after your fix, and keep the rest of the suite green. If a
   change of yours invalidates an existing assertion, rewrite that test rather
   than removing it.
3. Write `docs/search-widget-notes.md`: what caused the reported behaviour,
   what caused the contractor's observation, and an explicit answer to each of
   Priya's two additions — agreed or not, and why.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "storefront-search",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/search.html ===============
<div class="site-search">
  <label for="site-search">Search products</label>
  <input id="site-search" name="q" autocomplete="off" />
  <button id="site-search-clear" type="button">x</button>
  <ul id="site-search-listbox"></ul>
</div>

=============== FILE: src/combobox.js ===============
const MAX_RESULTS = 8;

export function createCombobox(products) {
  return { products, query: '', open: false, activeIndex: -1, domFocus: 'site-search' };
}

export function results(state) {
  if (!state.query) return [];
  const q = state.query.toLowerCase();
  return state.products.filter((p) => p.name.toLowerCase().includes(q)).slice(0, MAX_RESULTS);
}

export function typeChar(state, char) {
  // Keystrokes arrive at whatever element currently holds focus.
  if (state.domFocus !== 'site-search') return state;
  return { ...state, query: state.query + char, open: true, activeIndex: -1 };
}

export function keyDown(state, key) {
  const list = results(state);
  if (key === 'ArrowDown' && list.length) {
    const i = Math.min(state.activeIndex + 1, list.length - 1);
    return { ...state, open: true, activeIndex: i, domFocus: 'site-search-listbox' };
  }
  if (key === 'ArrowUp' && list.length) {
    const i = Math.max(state.activeIndex - 1, 0);
    return { ...state, activeIndex: i, domFocus: 'site-search-listbox' };
  }
  if (key === 'Escape' && state.open) {
    return { ...state, open: false, activeIndex: -1, domFocus: 'site-search' };
  }
  if (key === 'Escape') {
    return { ...state, query: '', activeIndex: -1, domFocus: 'site-search' };
  }
  return state;
}

export function render(state) {
  const list = results(state);
  return {
    wrapper: { class: 'site-search', 'aria-expanded': state.open ? 'true' : 'false' },
    input: {
      id: 'site-search',
      role: 'combobox',
      'aria-controls': 'site-search-listbox',
      'aria-autocomplete': 'list',
      value: state.query,
    },
    clear: { id: 'site-search-clear', tag: 'button', tabindex: '-1', 'aria-hidden': 'true', text: 'x' },
    listbox: {
      id: 'site-search-listbox',
      role: 'listbox',
      hidden: !state.open,
      'aria-activedescendant': state.activeIndex >= 0 ? 'option-' + list[state.activeIndex].id : '',
    },
    options: list.map((p, i) => ({
      id: 'opt-' + p.id,
      role: 'option',
      'aria-selected': i === state.activeIndex ? 'true' : 'false',
      text: p.name,
    })),
  };
}

=============== FILE: test/combobox.test.js ===============
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
