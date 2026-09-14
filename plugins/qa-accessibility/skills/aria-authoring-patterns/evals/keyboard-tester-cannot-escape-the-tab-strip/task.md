# Keyboard sweep filed the same complaint against both strips on the settings screen

## Problem Description

Marek ran the keyboard sweep on the workspace settings screen on 2026-09-11 and
came back with one complaint filed twice, once against each of the two
horizontal strips at the top of that screen. His notes are attached.

The two strips are:

- **The section strip** (`src/sections.js`) — General, Privacy, Members,
  Billing, Integrations, Advanced, plus a "Customize" button on the right-hand
  end that opens the section-reordering dialog. Picking a section swaps the
  panel below it. Nothing navigates; you stay on the same screen.
- **The workspace switcher** (`src/workspaces.js`) — Acme, Barrow, Cohen,
  Delta, Evered, Foxglove. Picking one loads that workspace: each entry points
  at `/w/<slug>` and the browser goes there.

Marek's ask is that both strips behave the same way, because to him they look
the same and cost the same: one press to get past either of them, arrow keys to
move around inside, and the current entry announced as the current one. Right
now neither does any of that, and his screen reader gives him nothing useful in
either place.

Do that, and tell me what you did. `npm test` is green today and has to be
green when you hand this back. Do not delete a test.

## Output Specification

1. Edit `src/sections.js` and `src/workspaces.js` wherever your answer says
   something should change there, and leave the rest as it is.
2. Update the test files so `npm test` passes and covers whatever behaviour you
   changed. If one of your changes invalidates an existing assertion, rewrite
   that test rather than removing it.
3. Write `docs/settings-keyboard.md`: for each of the two strips, the key
   bindings it supports after your change (one line each), what you did about
   each of Marek's five observations, and — where you did not do what he asked
   for — what you did instead and why.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "workspace-settings-header",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: docs/a11y-sweep-notes.md ===============
# Keyboard sweep - workspace settings, 2026-09-11, @marek

Keyboard only first, then again with the screen reader on.

1. Tabbing in from the address bar costs six presses to get past the workspace
   switcher and another seven to get past the section strip before I reach any
   content. Thirteen presses to reach the thing I came here to change. Every
   other strip in the product costs one.
2. Billing is the exception. If I tab in from the address bar it takes focus
   first - ahead of General, ahead of the whole workspace switcher above it,
   ahead of everything. It sits fourth in the section strip visually. I cannot
   explain it.
3. Arrow keys do nothing in either strip.
4. The screen reader reads each settings panel as "group", with no name. I can
   tell which panel I am in only by reading the content of it.
5. The "Customize" button on the end of the section strip is inconsistent with
   the rest of the strip - it takes its own press, like every section does.

=============== FILE: src/sections.js ===============
const SECTIONS = ['general', 'privacy', 'members', 'billing', 'integrations', 'advanced'];

export function createSections(ids = SECTIONS) {
  return { ids, selected: ids[0] };
}

export function selectSection(state, id) {
  if (!state.ids.includes(id)) return state;
  return { ...state, selected: id };
}

export function sectionKeyDown(state, key) {
  if (key === 'Enter' || key === ' ') return state;
  return state;
}

export function renderSections(state) {
  return {
    list: { id: 'settings-tablist', role: 'tablist', 'aria-label': 'Workspace settings' },
    tabs: state.ids.map((id, i) => ({
      id: 'tab-' + id,
      role: 'tab',
      'aria-selected': id === state.selected ? 'true' : 'false',
      'aria-controls': 'panel-' + id,
      tabindex: i === 3 ? '3' : '0',
      text: id[0].toUpperCase() + id.slice(1),
    })),
    extras: [
      { id: 'customize', tag: 'button', tabindex: '0', text: 'Customize' },
    ],
    panels: state.ids.map((id) => ({
      id: 'panel-' + id,
      role: 'tabpanel',
      hidden: id !== state.selected,
    })),
  };
}

=============== FILE: src/workspaces.js ===============
const WORKSPACES = [
  { slug: 'acme', name: 'Acme' },
  { slug: 'barrow', name: 'Barrow' },
  { slug: 'cohen', name: 'Cohen' },
  { slug: 'delta', name: 'Delta' },
  { slug: 'evered', name: 'Evered' },
  { slug: 'foxglove', name: 'Foxglove' },
];

export function createSwitcher(currentSlug, items = WORKSPACES) {
  return { items, current: currentSlug };
}

export function switcherKeyDown(state, key) {
  if (key === 'Enter') return state;
  return state;
}

export function renderSwitcher(state) {
  return {
    list: { id: 'workspace-switcher', tag: 'ul', 'aria-label': 'Workspaces' },
    items: state.items.map((w) => ({
      id: 'ws-' + w.slug,
      tag: 'a',
      href: '/w/' + w.slug,
      'aria-selected': w.slug === state.current ? 'true' : 'false',
      text: w.name,
    })),
  };
}

=============== FILE: test/sections.test.js ===============
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

=============== FILE: test/workspaces.test.js ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSwitcher, renderSwitcher } from '../src/workspaces.js';

test('every workspace is its own tab stop', () => {
  const rendered = renderSwitcher(createSwitcher('acme'));
  assert.equal(rendered.items.length, 6);
  assert.ok(rendered.items.every((i) => i.tabindex === undefined));
});

test('each workspace entry points at that workspace', () => {
  const rendered = renderSwitcher(createSwitcher('acme'));
  assert.equal(rendered.items[0].tag, 'a');
  assert.equal(rendered.items[0].href, '/w/acme');
  assert.equal(rendered.items[5].href, '/w/foxglove');
});

test('exactly one workspace is marked as the one you are in', () => {
  const rendered = renderSwitcher(createSwitcher('delta'));
  const marked = rendered.items.filter((i) => i['aria-selected'] === 'true');
  assert.equal(marked.length, 1);
  assert.equal(marked[0].id, 'ws-delta');
});
