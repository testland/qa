# Six presses to get past the action strip, plus two shortcuts design wants to take

## Problem Description

Marek ran the keyboard sweep on the workspace settings screen on 2026-09-11.
The thing he got stuck on is the action strip that sits above the view table —
six icon-only buttons (Refresh, Filter, Columns, Export, Share, Archive), each
with a short hint that pops up when you put the mouse on it. His notes are
attached; six observations.

Ines owns that strip on the design side and has already replied on the ticket
with two suggestions, both of which she would like taken because the sprint
closes Friday:

- "Marek's last one is easy — make the hints take themselves away a couple of
  seconds after they appear, the way the ones in the editor do. Then nothing is
  ever sitting on top of the table and we don't need any dismiss code at all.
  There is already a timeout in there, we just never hooked it up to anything."
- "Or go further and delete the hint divs entirely. Put the text in the
  buttons' `title` attribute and let the browser do hover, dismissal and
  positioning for free. Half the file goes away."

I want a call on each of her two, not just a silent yes or no, because she will
raise them again in the review on Friday and I need something I can say out
loud.

`npm test` is green today and has to be green when you hand this back.

## Output Specification

1. Edit `src/strip.js` wherever your answer says something should change there,
   and leave the rest as it is.
2. Update `test/strip.test.js` so `npm test` passes and covers whatever
   behaviour you changed. If a change of yours invalidates an existing
   assertion, rewrite that test rather than removing it.
3. Write `docs/view-actions-keyboard.md` containing: the key bindings the strip
   supports after your change, one line each; what you did about each of
   Marek's six observations; and an explicit answer to each of Ines's two
   suggestions — taken or not taken, and the reason, in terms that survive
   being said out loud in a design review.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "settings-action-strip",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: docs/a11y-sweep-notes.md ===============
# Keyboard sweep - workspace settings, view actions strip, 2026-09-11, @marek

Keyboard only first, then again with the screen reader on. Chrome + NVDA.

1. Crossing the strip costs six presses before I reach the table underneath.
   Every other bar in this product costs one.
2. Focusing any of the six buttons announces "button" and nothing else. I have
   no idea which one I am on until I press it and something happens.
3. The hints only ever appear under the mouse. Keyboard only, I have never seen
   one in the four months I have been testing this screen.
4. With the mouse: the Columns hint runs to two lines and it vanishes while I
   am still reading it. I have to take the pointer off the button and put it
   back to get the rest of the sentence.
5. Also with the mouse: if I move the pointer off the button and towards the
   hint so I can read it more slowly, it disappears before the pointer gets
   there.
6. The hint sits over the first row of the table and Esc does not get rid of
   it. The only way to clear it is to move the mouse somewhere else, and if I
   am not using the mouse I cannot clear it at all.

=============== FILE: src/strip.js ===============
const ACTIONS = [
  { id: 'refresh', label: 'Refresh', hint: 'Reload this list from the server.' },
  { id: 'filter', label: 'Filter', hint: 'Narrow the list by owner, status or date added.' },
  { id: 'columns', label: 'Columns', hint: 'Choose which columns appear and in what order. Hidden columns are still included in an export.' },
  { id: 'export', label: 'Export', hint: 'Download the current view as CSV.' },
  { id: 'share', label: 'Share', hint: 'Invite people to this view.' },
  { id: 'archive', label: 'Archive', hint: 'Move this view to the archive. You can restore it later.' },
];

export function createStrip(items = ACTIONS) {
  return { items, openHint: null };
}

export function pointerEnter(state, id) {
  return { ...state, openHint: id };
}

export function pointerLeave(state) {
  return { ...state, openHint: null };
}

export function stripKeyDown(state, key) {
  if (key === 'Enter' || key === ' ') return state;
  return state;
}

export function hintTimeout(state) {
  return state.openHint ? { afterMs: 3000, then: 'hide' } : null;
}

export function renderStrip(state) {
  return {
    bar: { id: 'view-actions', tag: 'div', 'aria-label': 'View actions' },
    buttons: state.items.map((a) => ({
      id: 'act-' + a.id,
      tag: 'button',
      tabindex: '0',
      text: '',
      icon: { tag: 'svg', 'aria-hidden': 'true', focusable: 'false' },
      'aria-describedby': 'hint-' + a.id,
    })),
    hints: state.items.map((a) => ({
      id: 'hint-' + a.id,
      role: 'tooltip',
      'aria-live': 'assertive',
      hidden: state.openHint !== a.id,
      text: a.hint,
    })),
  };
}

=============== FILE: test/strip.test.js ===============
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
