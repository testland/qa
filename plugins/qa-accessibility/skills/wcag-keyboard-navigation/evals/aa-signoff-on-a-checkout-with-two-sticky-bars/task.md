# Signing the Warrenby AA statement on a checkout with two bottom bars

## Problem Description

We are signing a WCAG 2.2 **Level AA** conformance statement for the Warrenby
County renewal on the 24th. Their procurement office reads the VPAT properly —
last cycle they came back on two rows and made a vendor withdraw — so this has
to be defensible line by line, not generous.

Nadia ran a keyboard sweep of the checkout on Friday and logged five findings
with measured geometry. The checkout has a sticky site header, a fixed action
bar pinned to the bottom of the viewport holding Pay and Back, and the cookie
consent strip that sits directly above the action bar until it is dismissed.

Nadia has filed all five as fails and wants all five fixed before the 24th.
That is four days of front-end work we do not have, and I am not willing to
sign a statement that claims we fixed things that were never in the way of it
either. What I need from you is the partition, with the reasoning attached to
each one, because I have to defend it to a procurement office that will ask.
"Not a blocker" and "fine" are not the same answer and I want both said out
loud where they apply.

There are also two proposals sitting in the thread — one from our front-end
lead about scroll behaviour, one from design about the focus styling. Both are
queued to ship around the statement. Deal with both of them in the same
document; I need one place to point people at.

The sweep report, the checkout stylesheet, the thread, and the little geometry
helper Nadia used (with its green tests) are attached.

## Output Specification

1. Write `docs/aa-blockers.md`. One section per finding F1..F5, each stating
   whether it blocks the Level AA statement, which success criterion it turns
   on, what the measured geometry shows, and — where it does not block AA —
   what it is instead.
2. Edit `src/checkout.css` so the findings that do block the AA statement stop
   blocking it. The three bars' `position`, `height`, `z-index` and background
   are contractual for the Warrenby skin — do not change them.
3. Answer both thread proposals in `docs/aa-blockers.md`, saying for each
   whether it ships as written and what changes if not.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "checkout-a11y-sweep",
  "version": "0.4.1",
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: reports/keyboard-sweep.md ===============
# Keyboard sweep — /checkout — 2026-09-11 — Nadia O.

Method: Chrome 141, 1440x900 viewport, keyboard only, Tab from the page
heading through submit. After each Tab the bounding box of the focused element
and of every fixed / sticky overlay was read from the devtools box model. All
three overlays are full-bleed horizontally and opaque `#ffffff`.

Overlay bands, viewport coordinates (y from the top, viewport is 900 tall):

| Overlay              | top | bottom | note                                   |
|----------------------|-----|--------|----------------------------------------|
| sticky site header   |   0 |     72 | always present                         |
| cookie consent strip | 744 |    836 | present until dismissed; most sessions |
| fixed action bar     | 836 |    900 | always present, holds Pay and Back     |

Findings, each measured at the moment the element took focus:

| Id | Element         | focused box (top..bottom) | bands it lands in    |
|----|-----------------|---------------------------|----------------------|
| F1 | `#card-number`  | 58..102                   | sticky site header   |
| F2 | `#promo-code`   | 848..888                  | fixed action bar     |
| F3 | `#billing-zip`  | 300..344                  | none                 |
| F4 | `#save-card`    | 760..780                  | cookie consent strip |
| F5 | `#gift-message` | 690..760                  | cookie consent strip |

Per-finding notes:

- **F1** — Tab from `#email` lands here. I could see the field and the caret.
  I logged it because the box reaches under the header.
- **F2** — Tab from `#card-cvc` lands here. I could not see where focus had
  gone and found it by reading `document.activeElement` in the console.
- **F3** — nothing over it at any scroll position. Logged for the focus ring:
  `outline: 2px solid #767676` against the `#ffffff` field background. I
  measured 4.54:1 and still could not pick it out on my laptop in daylight
  with the blind up.
- **F4** — the "save this card" checkbox. I found it the same way I found F2.
  In sessions where the consent strip was already dismissed on a previous
  visit it behaves normally.
- **F5** — the gift-message textarea. Label, first two lines and caret all
  visible; I typed into it and read back what I typed.

=============== FILE: src/checkout.css ===============
:root {
  --header-h: 72px;
  --actionbar-h: 64px;
  --consent-h: 92px;
}

.checkout-header {
  position: sticky;
  top: 0;
  height: var(--header-h);
  background: #ffffff;
  border-bottom: 1px solid #e6e6e6;
  z-index: 40;
}

.checkout-actions {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: var(--actionbar-h);
  background: #ffffff;
  border-top: 1px solid #e6e6e6;
  z-index: 40;
}

.cookie-consent {
  position: fixed;
  left: 0;
  right: 0;
  bottom: var(--actionbar-h);
  height: var(--consent-h);
  background: #ffffff;
  border-top: 1px solid #e6e6e6;
  z-index: 50;
}

.field input,
.field textarea,
.field select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #c2c2c2;
  border-radius: 6px;
  background: #ffffff;
}

.field input:focus,
.field textarea:focus,
.field select:focus {
  outline: 2px solid #767676;
  outline-offset: 2px;
}

=============== FILE: docs/thread-1188.md ===============
# #checkout-a11y — thread, 2026-09-12

## Proposal A — front-end lead

> Rather than chase individual fields, put one listener on the document and let
> the browser do the work:
>
>     document.addEventListener('focusin', (e) => {
>       e.target.scrollIntoView({ block: 'center', behavior: 'smooth' });
>     });
>
> Anything that takes focus ends up in the middle of the viewport, which is
> nowhere near either bar. That is the whole category closed in four lines and
> I can have it in tonight's build.

## Proposal B — design system PR #1188, queued behind the statement

> Brand refresh drops the browser ring in favour of the brand blue. Design
> signed this off last Thursday; it ships the week after the statement unless
> someone objects. Buttons, links and the Pay control were not in scope for the
> refresh and are not touched by this PR.
>
>     *:focus { outline: none; }
>
>     .field input:focus,
>     .field textarea:focus,
>     .field select:focus {
>       border-color: #1a73e8;
>       box-shadow: 0 0 0 1px #1a73e8;
>     }

=============== FILE: tools/obscured.js ===============
// Vertical-band geometry only: every overlay on this page is full-bleed.
export function overlapReport(target, overlays) {
  const height = target.bottom - target.top;
  const hits = overlays.filter((o) => o.bottom > target.top && o.top < target.bottom);

  const bands = hits
    .map((o) => [Math.max(o.top, target.top), Math.min(o.bottom, target.bottom)])
    .sort((a, b) => a[0] - b[0]);

  let coveredPx = 0;
  let cursor = target.top;
  for (const [start, end] of bands) {
    if (end <= cursor) continue;
    coveredPx += end - Math.max(start, cursor);
    cursor = end;
  }

  return {
    height,
    coveredPx,
    visiblePx: height - coveredPx,
    by: hits.map((o) => o.id),
  };
}

=============== FILE: test/obscured.test.js ===============
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { overlapReport } from '../tools/obscured.js';

const OVERLAYS = [
  { id: 'sticky site header', top: 0, bottom: 72 },
  { id: 'cookie consent strip', top: 744, bottom: 836 },
  { id: 'fixed action bar', top: 836, bottom: 900 },
];

test('an element clear of every band reports nothing covered', () => {
  const r = overlapReport({ top: 300, bottom: 344 }, OVERLAYS);
  assert.equal(r.coveredPx, 0);
  assert.equal(r.visiblePx, 44);
  assert.deepEqual(r.by, []);
});

test('an element reaching under one band reports the covered depth', () => {
  const r = overlapReport({ top: 58, bottom: 102 }, OVERLAYS);
  assert.equal(r.height, 44);
  assert.equal(r.coveredPx, 14);
  assert.equal(r.visiblePx, 30);
  assert.deepEqual(r.by, ['sticky site header']);
});

test('the gift-message box reaches under the consent strip', () => {
  const r = overlapReport({ top: 690, bottom: 760 }, OVERLAYS);
  assert.equal(r.coveredPx, 16);
  assert.equal(r.visiblePx, 54);
});

test('adjacent bands are not double-counted', () => {
  const r = overlapReport({ top: 800, bottom: 900 }, OVERLAYS);
  assert.equal(r.coveredPx, 100);
  assert.deepEqual(r.by, ['cookie consent strip', 'fixed action bar']);
});
