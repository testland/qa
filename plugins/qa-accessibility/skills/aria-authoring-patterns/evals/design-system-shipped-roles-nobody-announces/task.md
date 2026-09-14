# External audit came back on five of our primitives and I need them closed out

## Problem Description

Farrow Digital finished the audit of `@acme/primitives` on Tuesday and their
summary is attached. Five components are on their list. Three of them they
tested by hand with a screen reader; the other two they picked up in the
automated pass and ran out of hours before they could verify manually, so those
two are "flagged, unverified" and I do not know whether they are real.

Two house rules you need to work within, because they are why this library is
maintainable at all:

- `tokens/roles.json` is the single source of truth for what every component
  announces. Components never hard-code semantics; they read the token. If a
  component needs different semantics, the token changes, not the component.
- The suite pins the rendered output of every primitive, deliberately, so that
  a semantics change cannot ship by accident. It is green right now. Anything
  you change there you change on purpose and you say why.

Fix what is broken. For the two unverified ones, tell me whether Farrow is
right before we spend a sprint churning components that are already correct —
`@acme/primitives` is consumed by nine internal apps and every change costs
each of them a regression pass, so a change I cannot justify to nine teams is
worse than no change.

## Output Specification

1. Update `tokens/roles.json` and `src/render.js`.
2. Update `test/render.test.js` so `npm test` passes and pins the corrected
   output. Rewrite the assertions you invalidate rather than deleting them.
3. Write `docs/role-map.md` with one row per component: what it announces
   today, what it should announce, whether a plain HTML element would cover the
   case, and — for the two unverified ones — your verdict and the reason.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "acme-primitives",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: docs/audit-note.md ===============
# Farrow Digital - @acme/primitives, findings summary, 2026-09-08

Tested with NVDA 2025.2 / Firefox and VoiceOver / Safari 18.

## Verified by hand

1. **Collapsible** (the "Shipping options" trigger). Announced as "Shipping
   options, button, not pressed". Activating it does reveal the region, but
   nothing in the announcement tells the user the region opened or closed.
   Testers could not tell whether activating it had done anything.
2. **Counter** (the quantity stepper on a cart line). Announced as "spin
   button, 3". Tab goes straight from "Decrease quantity" to "Increase
   quantity" - the value itself is never reached - and Up and Down arrows do
   nothing anywhere in the control. There is no way to change the quantity
   without a pointer.
3. **Menu trigger** (the "Account" button). Announced as "Account, menu".
   Opening it produces a plain list of three links, and the screen reader
   reports the menu as containing no items at all.

## Flagged in the automated pass, NOT verified by hand

4. **Toggle** (the "Email digest" control).
5. **Hint** (the tooltip on "Save").

We ran out of hours. Treat 4 and 5 as unconfirmed.

=============== FILE: tokens/roles.json ===============
{
  "collapsible": { "role": "button", "state": "aria-pressed" },
  "counter": { "role": "spinbutton", "state": "aria-valuenow" },
  "menu-trigger": { "role": "menu", "state": "aria-expanded" },
  "toggle": { "role": "switch", "state": "aria-checked" },
  "hint": { "role": "tooltip", "state": null }
}

=============== FILE: src/render.js ===============
import { readFileSync } from 'node:fs';

const TOKENS = JSON.parse(readFileSync(new URL('../tokens/roles.json', import.meta.url), 'utf8'));

export function attrsFor(component, state = {}) {
  const token = TOKENS[component];
  if (!token) throw new Error('unknown component: ' + component);
  const attrs = {};
  if (token.role) attrs.role = token.role;
  if (token.state) attrs[token.state] = String(state.value);
  if (state.controls) attrs['aria-controls'] = state.controls;
  return attrs;
}

export function renderCollapsible(open, regionId) {
  return {
    trigger: { tag: 'button', text: 'Shipping options', ...attrsFor('collapsible', { value: open, controls: regionId }) },
    region: { tag: 'div', id: regionId, hidden: !open },
  };
}

export function renderCounter(count) {
  return {
    minus: { tag: 'button', 'aria-label': 'Decrease quantity' },
    field: { tag: 'div', text: String(count), ...attrsFor('counter', { value: count }) },
    plus: { tag: 'button', 'aria-label': 'Increase quantity' },
  };
}

export function renderMenuTrigger(open, menuId) {
  return {
    trigger: { tag: 'button', text: 'Account', ...attrsFor('menu-trigger', { value: open, controls: menuId }) },
    menu: {
      tag: 'ul',
      id: menuId,
      hidden: !open,
      items: [
        { tag: 'li', link: { tag: 'a', href: '/profile', text: 'Profile' } },
        { tag: 'li', link: { tag: 'a', href: '/billing', text: 'Billing' } },
        { tag: 'li', link: { tag: 'a', href: '/logout', text: 'Sign out' } },
      ],
    },
  };
}

export function renderToggle(on) {
  return {
    control: { tag: 'button', text: 'Email digest', ...attrsFor('toggle', { value: on }) },
  };
}

export function renderHint(bubbleId, text) {
  return {
    trigger: { tag: 'button', text: 'Save' },
    bubble: { tag: 'div', id: bubbleId, text, hidden: true, ...attrsFor('hint') },
  };
}

=============== FILE: test/render.test.js ===============
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
