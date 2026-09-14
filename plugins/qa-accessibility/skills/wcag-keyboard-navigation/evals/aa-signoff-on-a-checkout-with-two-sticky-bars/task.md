# Which of these five sweep findings actually blocks our AA statement

## Problem Description

We are signing a WCAG 2.2 **Level AA** conformance statement for the Warrenby
County renewal on the 24th. Their procurement office reads the VPAT properly —
last cycle they came back on two rows and made a vendor withdraw — so I need
this to be defensible, not generous.

Nadia ran a keyboard sweep of the checkout on Friday and logged five findings
with measured geometry. The checkout has a sticky header, a fixed action bar
pinned to the bottom of the viewport, and the cookie consent strip that sits
above the action bar until it is dismissed. Nadia has flagged all five as
"fails" and wants them all fixed before the 24th; our front-end lead says three
of them are "not real" but will not say which three.

I need the honest partition. Some of these findings block a Level AA statement
and some of them do not, and I would rather ship a document that says "this one
is a genuine AA failure, this one is a real defect that our target does not
cover, and here is why" than either sign off on everything or panic-fix
everything four days out.

The lead also wants to add a global `focusin` listener on `document` that calls
`el.scrollIntoView({ block: 'center' })` on whatever just took focus, and call
the whole category closed. Tell me whether that is the move.

The sweep report, the checkout stylesheet, and the little geometry helper Nadia
used (with its green tests) are attached.

## Output Specification

1. Write `docs/aa-blockers.md`. One section per finding F1..F5, each stating
   whether it blocks the Level AA statement, what the measured geometry shows,
   and — where it does not block AA — what it is instead, since "not an AA
   blocker" is not the same as "fine".
2. Edit `src/checkout.css` so the findings that do block AA stop blocking it.
   Do not change the visual design of the sticky bars; they are contractual.
3. Answer the `focusin` proposal in `docs/aa-blockers.md`.

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
and of every fixed / sticky overlay was read from the devtools box model.

Overlay bands, viewport coordinates (y from the top, viewport is 900 tall):

| Overlay              | top | bottom | note                                   |
|----------------------|-----|--------|----------------------------------------|
| sticky site header   |   0 |     72 | always present                         |
| cookie consent strip | 744 |    836 | present until dismissed; most sessions |
| fixed action bar     | 836 |    900 | always present, holds Pay and Back     |

Findings, each measured at the moment the element took focus:

| Id | Element         | focused box (top..bottom) | overlaps                  |
|----|-----------------|---------------------------|---------------------------|
| F1 | `#card-number`  | 58..102                   | sticky site header 58..72 |
| F2 | `#promo-code`   | 848..888                  | fixed action bar 848..888 |
| F3 | `#billing-zip`  | 300..344                  | none                      |
| F4 | `#save-card`    | 760..780                  | cookie consent 760..780   |
| F5 | `#gift-message` | 690..760                  | cookie consent 744..760   |

Per-finding notes:

- **F1** — Tab from `#email` lands here. The top 14px of the field, including
  the top edge of its focus ring, sits behind the header. The rest of the field
  and its caret are visible.
- **F2** — Tab from `#card-cvc` lands here. Nothing of the field is visible; the
  action bar is opaque `#ffffff` with a top border. Nadia only found it by
  reading `document.activeElement` in the console.
- **F3** — fully visible, nothing over it. Logged because the focus ring is
  `outline: 1px solid #d4d4d4` against the `#ffffff` field background, which
  Nadia measured at 1.27:1 and could not see on her laptop in daylight.
- **F4** — the "save this card" checkbox. Entirely behind the consent strip,
  which is opaque. Visible only in sessions where the user already dismissed
  the strip on a previous visit.
- **F5** — the gift-message textarea. Its bottom 16px sits behind the consent
  strip; the first two lines, the label and the top of the focus ring are all
  visible and the caret is visible while typing on line one.

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
  outline: 1px solid #d4d4d4;
  outline-offset: 2px;
}

=============== FILE: tools/obscured.js ===============
// Vertical-band geometry only: every overlay on this page is full-bleed.
export function obscuredBy(target, overlays) {
  const hits = overlays.filter((o) => o.bottom > target.top && o.top < target.bottom);
  if (hits.length === 0) return { kind: 'none', coveredPx: 0, by: [] };

  const fully = hits.find((o) => o.top <= target.top && o.bottom >= target.bottom);
  const coveredPx = hits.reduce((max, o) => {
    const overlap = Math.min(o.bottom, target.bottom) - Math.max(o.top, target.top);
    return Math.max(max, overlap);
  }, 0);

  return {
    kind: fully ? 'entire' : 'partial',
    coveredPx,
    by: hits.map((o) => o.id),
  };
}

=============== FILE: test/obscured.test.js ===============
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { obscuredBy } from '../tools/obscured.js';

const OVERLAYS = [
  { id: 'sticky site header', top: 0, bottom: 72 },
  { id: 'cookie consent strip', top: 744, bottom: 836 },
  { id: 'fixed action bar', top: 836, bottom: 900 },
];

test('an element clear of every band is not obscured', () => {
  const r = obscuredBy({ top: 300, bottom: 344 }, OVERLAYS);
  assert.equal(r.kind, 'none');
  assert.equal(r.coveredPx, 0);
});

test('an element clipped by one band reports the covered depth', () => {
  const r = obscuredBy({ top: 58, bottom: 102 }, OVERLAYS);
  assert.equal(r.kind, 'partial');
  assert.equal(r.coveredPx, 14);
  assert.deepEqual(r.by, ['sticky site header']);
});

test('an element inside a band is reported as fully covered', () => {
  const r = obscuredBy({ top: 848, bottom: 888 }, OVERLAYS);
  assert.equal(r.kind, 'entire');
  assert.deepEqual(r.by, ['fixed action bar']);
});

test('the consent strip swallows the save-card checkbox', () => {
  const r = obscuredBy({ top: 760, bottom: 780 }, OVERLAYS);
  assert.equal(r.kind, 'entire');
  assert.deepEqual(r.by, ['cookie consent strip']);
});
