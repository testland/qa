# Analytics tab strip: the panel changes, the screen reader stays put

## Problem Description

Two complaints landed on the analytics dashboard tab strip in the same week and
I need both answered in one go, because the thread has already turned into an
argument and I would rather not relitigate it in review.

The first is from a screen-reader user at Norbridge Health. She presses the
right arrow on the tab strip; the chart underneath changes to the next tab's
content, but NVDA keeps announcing "Overview, tab, one of seven" no matter how
many times she presses it. She has to guess what she is looking at.

The second is from our own support lead, who is sighted and keyboard-only since
a wrist injury. He says that once he is on the strip he cannot get off it —
Tab does nothing at all — and he ends up reaching for the mouse to get down to
the chart, which is the thing he cannot comfortably do.

Our front-end lead has replied in the thread defending the current behaviour,
and our a11y consultant has replied with a fix for the first report. Both
replies are in the ticket. I want the strip fixed properly and I want a short
written answer to each of them that I can paste back into the thread.

The module, the glue that mounts it on the dashboard, and the green test suite
are attached, along with the ticket.

## Output Specification

1. Fix `src/tabs.js`. `createTabs` and the shape it returns are imported by
   three dashboards, so keep the exported surface working.
2. Add cases to `test/tabs.test.js` that are red against the supplied module and
   green after your change. The suite must keep running under `node --test`. If
   a supplied case locks in behaviour you are deliberately changing, update that
   case and name it in the write-up; leave the rest of the suite alone.
3. Write `docs/tabs-keyboard-review.md`: what was actually wrong, what the strip
   does key by key afterwards, and a direct answer to each of the two replies in
   the thread.

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
    focusTargetId: 'tab-0',
  };

  function tabId(index) {
    return `tab-${index}`;
  }

  function panelId(index) {
    return `panel-${index}`;
  }

  function attrsFor(index) {
    return {
      id: tabId(index),
      role: 'tab',
      tabindex: index === state.activeIndex ? '0' : '-1',
      'aria-selected': index === state.activeIndex ? 'true' : 'false',
      'aria-controls': panelId(index),
    };
  }

  function panelAttrsFor(index) {
    return {
      id: panelId(index),
      role: 'tabpanel',
      tabindex: '0',
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
    // The strip is a single tab stop, so Tab must not walk from tab to tab.
    if (event.key === 'Tab') {
      event.preventDefault();
      return true;
    }
    if (event.key === 'ArrowRight') return select(state.activeIndex + 1);
    if (event.key === 'ArrowLeft') return select(state.activeIndex - 1);
    if (event.key === 'Home') return select(0);
    if (event.key === 'End') return select(state.labels.length - 1);
    return false;
  }

  return { state, attrsFor, panelAttrsFor, handleKeydown, select, tabId, panelId };
}

=============== FILE: src/dashboard-glue.js ===============
import { createTabs } from './tabs.js';

// Each dashboard mounts the strip the same way: re-render, then put the reader
// wherever the module says it belongs.
export function mountTabs(root, labels, render) {
  const tabs = createTabs(labels);

  root.querySelector('[role="tablist"]').addEventListener('keydown', (event) => {
    tabs.handleKeydown(event);
    render(tabs);
    root.ownerDocument.getElementById(tabs.state.focusTargetId)?.focus();
  });

  render(tabs);
  return tabs;
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
  const event = {
    key,
    shiftKey: false,
    ctrlKey: false,
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
  };
  tabs.handleKeydown(event);
  return event;
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

test('home and end jump to the ends of the strip', () => {
  const tabs = createTabs(LABELS);
  press(tabs, 'End');
  assert.equal(tabs.state.activeIndex, 6);
  press(tabs, 'Home');
  assert.equal(tabs.state.activeIndex, 0);
});

test('only the selected tab sits in the page tab sequence', () => {
  const tabs = createTabs(LABELS);
  press(tabs, 'ArrowRight');
  assert.equal(tabs.attrsFor(1).tabindex, '0');
  assert.deepEqual(
    [0, 2, 3, 4, 5, 6].map((i) => tabs.attrsFor(i).tabindex),
    ['-1', '-1', '-1', '-1', '-1', '-1'],
  );
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

test('the strip keeps tab from walking from tab to tab', () => {
  const tabs = createTabs(LABELS);
  const event = press(tabs, 'Tab');
  assert.equal(event.defaultPrevented, true);
});

test('the strip starts with the reader on the first tab', () => {
  const tabs = createTabs(LABELS);
  assert.equal(tabs.state.focusTargetId, tabs.tabId(0));
});

=============== FILE: docs/ticket-4471.md ===============
# TICKET-4471 — analytics tab strip, keyboard

Two reports, merged.

## 4471-a — Norbridge Health, NVDA 2025.2 / Chrome 141

> I land on Overview and press the right arrow. The numbers underneath change —
> I can tell because the table read differently when I went and found it — but
> the reader keeps saying "Overview, tab, one of seven". I never know which tab
> I am on unless I go and read the panel.

Reproduced in-house on the dashboard and on the two other strips that mount the
same module.

## 4471-b — internal, support lead, keyboard-only

> Once I am on the strip I am stuck on it. Tab does nothing — not once, not
> held down. The only way I get to the chart is with the mouse, and the mouse is
> the thing my wrist will not do.

## Reply from the front-end lead

> 4471-b is not a bug, it is the pattern. A tab strip is meant to be one stop
> and the arrows are how you move inside it, so Tab is suppressed on purpose —
> that line has a comment on it and a test. He should be using arrows. If we
> really want him at the chart in one press, take the strip out of the tab
> order altogether and he lands straight on the panel.

## Reply from the a11y consultant

> For 4471-a, put `aria-live="assertive"` on the panel wrapper. Then every time
> the arrow changes the selection the reader announces the new content and she
> knows where she is. One attribute, no logic change, and it fixes the report
> she actually filed.
