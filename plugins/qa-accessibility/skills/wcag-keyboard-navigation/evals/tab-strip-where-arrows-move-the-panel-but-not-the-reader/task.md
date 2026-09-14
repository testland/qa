# Analytics tab strip: the panel changes, the screen reader stays put

## Problem Description

Two complaints landed on the analytics dashboard tab strip in the same week and
I think they are the same bug wearing two hats.

The first is from a screen-reader user at Norbridge Health. She presses the
right arrow on the tab strip; the chart underneath changes to the next tab's
content, but NVDA keeps announcing "Overview, tab, one of seven" no matter how
many times she presses it. She has to guess what she is looking at.

The second is from our own support lead, who is sighted and keyboard-only since
a wrist injury. On the dashboard he counts seven Tab presses to get from the
page heading down to the chart he actually wants to interact with. He says the
settings page, which has a similar strip built by a different team, takes one.

Our front-end lead has already replied in the thread with a fix: "the strip is
inconsistent, some of this is arrow-key cleverness that fights the browser.
Simplest thing is to make every tab a normal tab stop and delete the arrow
handling — then everything is reachable with Tab like the rest of the page and
there is nothing custom to get wrong." He wants to do it this afternoon.

I do not want to relitigate this in review, so I want the strip fixed properly
now, and I want a short written answer to his proposal that I can paste in the
thread. The module and its green test suite are attached, along with the ticket.

## Output Specification

1. Fix `src/tabs.js`. `createTabs` and the shape it returns are imported by
   three dashboards, so keep the exported surface working.
2. Add cases to `test/tabs.test.js` that are red against the supplied module and
   green after your change. The suite must keep running under `node --test`.
3. Write `docs/tabs-keyboard-review.md`: what was actually wrong, what the strip
   does now key by key, and a direct answer to the proposal in the thread.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "analytics-tabs",
  "version": "1.9.3",
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/tabs.js ===============
export function createTabs(labels) {
  const state = {
    labels,
    activeIndex: 0,
    focusedElementId: null,
  };

  function tabId(index) {
    return `tab-${index}`;
  }

  function panelId(index) {
    return `panel-${index}`;
  }

  // Attributes rendered onto each tab button.
  function attrsFor(index) {
    return {
      id: tabId(index),
      role: 'tab',
      tabindex: '0',
      'aria-selected': index === state.activeIndex ? 'true' : 'false',
      'aria-controls': panelId(index),
    };
  }

  function panelAttrsFor(index) {
    return {
      id: panelId(index),
      role: 'tabpanel',
      'aria-labelledby': tabId(index),
      hidden: index !== state.activeIndex,
    };
  }

  function select(index) {
    if (index < 0 || index >= state.labels.length) return false;
    state.activeIndex = index;
    return true;
  }

  function handleKeydown(event) {
    if (event.key === 'ArrowRight') {
      return select(state.activeIndex + 1);
    }
    if (event.key === 'ArrowLeft') {
      return select(state.activeIndex - 1);
    }
    return false;
  }

  return { state, attrsFor, panelAttrsFor, handleKeydown, select, tabId, panelId };
}

=============== FILE: test/tabs.test.js ===============
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

=============== FILE: docs/ticket-4471.md ===============
# TICKET-4471 — analytics tab strip, keyboard

Two reports, merged.

## 4471-a — Norbridge Health, NVDA 2025.2 / Chrome 141

> I land on Overview and press the right arrow. The numbers underneath change —
> I can tell because the table read differently when I went and found it — but
> the reader keeps saying "Overview, tab, one of seven". I never know which tab
> I am on unless I go and read the panel.

Reproduced in-house. Pressing the right arrow updates the rendered strip and
the panel. The reader is still parked on the Overview button.

## 4471-b — internal, support lead, keyboard-only

> Seven Tab presses from the page title before I reach the chart. On the
> settings page the equivalent strip is one press and then arrows. Why is the
> dashboard different?

## Thread reply from the front-end lead

> Half of this is arrow-key cleverness fighting the browser. Make every tab a
> normal tab stop, delete handleKeydown, and everything is reachable with Tab
> like every other control on the page. One less custom behaviour to maintain.
> I can have it up this afternoon.
