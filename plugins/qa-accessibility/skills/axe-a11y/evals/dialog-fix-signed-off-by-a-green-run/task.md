# PR 814 wants sign-off and says the scan output backs him up

## Problem Description

Customer ticket LED-3391: a screen-reader user on `/checkout` opens **Edit
shipping address**, and from there cannot tell what has opened or get back out.
Five weeks old, and the customer's procurement team is now copied on it.

PR #814 is the fix. The author gave the dialog a focus trap and a name, and he
added our first automated accessibility check with it. The check does open the
dialog before it scans - I checked that much myself - and it comes back green.
He wants sign-off today.

He is asking for two things in the same PR and I want them answered separately.
The first is the sign-off, on the grounds that the green result covers the
thing the customer complained about. The second is that I bless the two
suppressions he has put in the check and make them permanent. One of them is
about `#pay-frame`, the card-entry iframe our payment vendor renders through
our own domain; we do not author a byte of what is inside it and there is a
note about it under `docs/`.

His PR note, the scan output the job wrote, and the dialog component are all
attached. Our contract with this customer names WCAG 2.2 AA specifically -
`docs/procurement-clause.md` has the wording, and the thirty-day remediation
window closed last Sunday.

Give me back a review I can paste into the PR, and leave the check in a state
where the next green result is worth something.

## Output Specification

1. Rewrite `tests/a11y/checkout.spec.ts`, or replace it with whatever set of
   files you think is right. Assume the page exposes a button named `Edit
   shipping address`, that the dialog carries `data-testid="address-dialog"`,
   and that the vendor iframe is `#pay-frame`.
2. Write `docs/pr-814-review.md`: whether the attached result is evidence
   LED-3391 is fixed and what in that output tells you so, a separate answer to
   each of the author's two asks, and what still needs a human.
3. Do not edit `src/components/address-dialog.jsx` - the component is the
   author's to change, not the reviewer's. Say what should change there, do not
   change it.
4. `npm test` must stay green and `test/format-money.test.js` must not be
   edited. No new dependencies for the unit suite.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "ledger-app",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test",
    "test:a11y": "playwright test tests/a11y"
  },
  "devDependencies": {
    "@axe-core/playwright": "^4.10.1",
    "@playwright/test": "^1.49.1",
    "axe-core": "^4.10.2"
  }
}

=============== FILE: tests/a11y/checkout.spec.ts ===============
import { test, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';

test('checkout is accessible', async ({ page }) => {
  await page.goto('/checkout');
  await page.getByRole('button', { name: 'Edit shipping address' }).click();
  await page.getByTestId('address-dialog').waitFor();

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
    .exclude('#pay-frame')
    .disableRules(['color-contrast'])
    .options({ resultTypes: ['violations'] })
    .analyze();

  writeFileSync('reports/pr-814-axe.json', JSON.stringify(results, null, 2));
  expect(results.violations).toEqual([]);
});

=============== FILE: reports/pr-814.md ===============
# PR #814 - fix LED-3391, name and trap focus in the address dialog

The dialog now has an accessible name and a focus trap, so tab does not escape
into the page behind it. Also adds `tests/a11y/checkout.spec.ts`, our first
automated accessibility check.

How the check is set up:

- Pinned to WCAG 2.2 AA, which is the standard named in clause 11.4. Nothing
  outside that standard can red the job.
- `#pay-frame` taken out of scope. The vendor's card form renders through our
  domain so the scan walks straight into it, and it reported their markup at us
  for a week. Note is in `docs/vendor-pay-frame.md`.
- `color-contrast` switched off. Our gradient buttons make it fire constantly
  and design are re-cutting those tokens under DS-77 anyway.
- Only asked for the violations back. The run is 40% quicker and violations are
  the only part anyone reads.

Result is attached. Zero violations, and `incomplete` has a single contrast
node, so there is essentially nothing left for a human on checkout. Green means
LED-3391 is covered.

Two asks:

1. Sign this off today, procurement is chasing.
2. Bless both suppressions above so nobody re-litigates them every sprint.

Follow-up next sprint: fold `/cart`, `/checkout/confirm` and the three account
pages into this same test, so we end up with one accessibility check covering
the whole app instead of a pile of near-identical files.

=============== FILE: reports/pr-814-axe.json ===============
{
  "url": "http://localhost:3000/checkout",
  "timestamp": "2026-09-12T09:41:55.109Z",
  "testEngine": { "name": "axe-core", "version": "4.10.2" },
  "testRunner": { "name": "axe" },
  "toolOptions": { "reporter": "v1", "resultTypes": ["violations"] },
  "violations": [],
  "incomplete": [
    {
      "id": "color-contrast",
      "impact": "serious",
      "tags": ["cat.color", "wcag2aa", "wcag143"],
      "description": "Ensures the contrast between foreground and background colours meets WCAG 2 AA thresholds",
      "helpUrl": "https://dequeuniversity.com/rules/axe/4.10/color-contrast",
      "nodes": [
        {
          "target": ["button.checkout-submit"],
          "html": "<button class=\"checkout-submit\">Place order</button>",
          "failureSummary": "Element background could not be determined due to a background gradient"
        }
      ]
    },
    {
      "id": "aria-hidden-focus",
      "impact": "serious",
      "tags": ["cat.name-role-value", "wcag2a", "wcag412"],
      "description": "Ensures aria-hidden elements are not focusable nor contain focusable elements",
      "helpUrl": "https://dequeuniversity.com/rules/axe/4.10/aria-hidden-focus",
      "nodes": [
        {
          "target": [".page-shell"],
          "html": "<div class=\"page-shell\" aria-hidden=\"true\">",
          "failureSummary": "Element is focusable but axe could not determine whether it is visible"
        }
      ]
    }
  ],
  "passes": [
    { "id": "aria-dialog-name", "nodes": [{ "target": ["[data-testid=\"address-dialog\"]"] }] },
    { "id": "button-name", "nodes": [{ "target": ["button.checkout-submit"] }] },
    { "id": "label", "nodes": [{ "target": ["#dlg-street"] }] },
    { "id": "html-has-lang", "nodes": [{ "target": ["html"] }] },
    { "id": "document-title", "nodes": [{ "target": ["html"] }] },
    { "id": "region", "nodes": [{ "target": ["main"] }] },
    { "id": "landmark-one-main", "nodes": [{ "target": ["main"] }] },
    { "id": "page-has-heading-one", "nodes": [{ "target": ["h1"] }] },
    { "id": "empty-heading", "nodes": [{ "target": ["h2.panel-title"] }] }
  ],
  "inapplicable": [
    { "id": "video-caption" },
    { "id": "area-alt" },
    { "id": "blink" },
    { "id": "marquee" }
  ]
}

=============== FILE: src/components/address-dialog.jsx ===============
import { useEffect, useRef } from 'react';

export function AddressDialog({ open, onClose, address, onSave }) {
  const panel = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const node = panel.current;
    const focusable = node.querySelectorAll('button, input, [href]');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    function onKeyDown(event) {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab') return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    node.addEventListener('keydown', onKeyDown);
    first.focus();
    return () => node.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="overlay">
      <div
        className="panel"
        role="dialog"
        aria-labelledby="dlg-title"
        ref={panel}
        data-testid="address-dialog"
      >
        <h2 className="panel-title" id="dlg-title">Shipping address</h2>
        <input id="dlg-street" defaultValue={address.street} />
        <input id="dlg-city" defaultValue={address.city} />
        <button onClick={onClose}>Cancel</button>
        <button onClick={() => onSave(address)}>Save</button>
      </div>
    </div>
  );
}

=============== FILE: docs/procurement-clause.md ===============
# Contract clause 11.4 - accessibility

> Supplier warrants that the ordering and checkout interfaces conform to Web
> Content Accessibility Guidelines 2.2 Level AA, and shall remediate any
> non-conformance reported by Customer within thirty (30) days of notice.

Notice for LED-3391 was served 2026-08-08. Thirty days elapsed 2026-09-07.

=============== FILE: docs/vendor-pay-frame.md ===============
# `#pay-frame` - hosted card entry

The vendor's card form renders inside `#pay-frame`, proxied through our own
domain at `/pay/card` so their session cookies work. Same origin as far as the
browser is concerned, so anything scanning the page walks into it - but every
byte inside it is authored and deployed by the vendor.

- 2026-03-11  asked the vendor to fix the markup their frame renders. Declined.
- 2026-07-29  asked again with the ticket reference. Declined again, in writing.
- Migration off the hosted form is on the roadmap for H1 next year. No date.

=============== FILE: src/format-money.js ===============
export function formatMinor(minorUnits, currency) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(minorUnits / 100);
}

=============== FILE: test/format-money.test.js ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { formatMinor } from '../src/format-money.js';

test('formats minor units as currency', () => {
  assert.equal(formatMinor(129900, 'USD'), '$1,299.00');
});
