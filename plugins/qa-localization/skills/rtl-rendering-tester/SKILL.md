---
name: rtl-rendering-tester
description: "Build-an-X workflow for verifying RTL (right-to-left) layouts - runs the test suite under Arabic / Hebrew / Persian / Urdu locales, asserts the `dir=\"rtl\"` attribute is set, verifies layout mirrors correctly (text alignment, icon positions, scrollbar location), uses logical CSS properties (`start`/`end` over `left`/`right`) per W3C guidance, captures per-locale screenshots for visual review. Use when the app supports RTL languages."
---

# rtl-rendering-tester

## Overview

Per [w3-rtl][w3rtl], `dir="rtl"` on the `<html>` tag is the standard signal for
right-to-left direction: blocks align right, bidi text flows right-to-left,
table columns progress right-to-left, and form inputs start at the right. This
skill verifies the app handles those under Arabic, Hebrew, Persian, and Urdu.

[w3rtl]: https://www.w3.org/International/questions/qa-html-dir

## When to use

- The product supports any RTL language.
- A new feature ships; RTL regression check before release.
- A bug report says "looks wrong in Arabic / Hebrew."

## Step 1 - Verify `dir` attribute presence

```typescript
import { test, expect } from '@playwright/test';

test.use({ extraHTTPHeaders: { 'Accept-Language': 'ar' } });

test('Arabic locale sets dir=rtl on <html>', async ({ page }) => {
  await page.goto('/');
  const dir = await page.locator('html').getAttribute('dir');
  expect(dir).toBe('rtl');
});

test('Hebrew locale sets dir=rtl on <html>', async ({ page }) => {
  await page.goto('/?lng=he');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
});
```

Per [w3-rtl][w3rtl]: the `html`-level `dir` is the canonical
signal; CSS-only direction setting is incorrect:

> "Do _not_ use CSS to apply base direction in HTML pages.
> Direction is semantic content and should reside in markup, not
> styling."

## Step 2 - Verify text alignment

```typescript
test('text aligns right in RTL', async ({ page }) => {
  await page.goto('/?lng=ar');
  const heading = page.locator('h1').first();
  const align = await heading.evaluate(el => getComputedStyle(el).textAlign);
  expect(['right', 'start']).toContain(align);   // 'start' resolves to right in RTL
});
```

Per [w3-rtl][w3rtl]: prefer logical properties (`start`, `end`)
over directional (`left`, `right`) so the layout flips automatically.

## Step 3 - Verify icon positions

Directional icons (back/forward and pagination arrows, direction chevrons) must
mirror in RTL; brand logos and icons with embedded text must not.

```typescript
test('back arrow mirrors in RTL', async ({ page }) => {
  await page.goto('/cart?lng=ar');
  const backArrow = page.getByRole('link', { name: /back/i });
  const transform = await backArrow.evaluate(el => getComputedStyle(el).transform);
  // RTL should apply scaleX(-1) (or use a different mirrored asset)
  expect(transform).toContain('-1');
});
```

## Step 4 - Bidi text in mixed contexts

Mixed LTR + RTL content is a common bidi issue:

```text
"My order #ORD-12345 has shipped."
```

In Arabic locale, the order number "ORD-12345" must remain LTR
inside the RTL paragraph. Without proper bidi markers, the
ordering can flip.

```typescript
test('order number preserves LTR direction inside RTL paragraph', async ({ page }) => {
  await page.goto('/orders/ORD-12345?lng=ar');
  const paragraph = page.locator('p').filter({ hasText: 'ORD-12345' });
  const orderNumber = paragraph.locator('bdi, [dir="ltr"]');
  await expect(orderNumber).toBeVisible();
  await expect(orderNumber).toHaveText('ORD-12345');
});
```

The `<bdi>` element or `dir="ltr"` on a span isolates LTR text
within an RTL block - without it, browser bidi heuristics may
flip.

## Step 5 - Form input behavior

Per [w3-rtl][w3rtl]: in RTL, "Form inputs start at the right by
default."

```typescript
test('form inputs start at right in RTL', async ({ page }) => {
  await page.goto('/checkout?lng=he');
  const emailField = page.getByLabel(/email/i);
  await emailField.click();
  // Cursor / placeholder text should be at the right edge
  // (assert via screenshot or computed-style direction)
  await expect(emailField).toHaveCSS('text-align', /(right|start)/);
});
```

## Step 6 - Supplementary checks

Three checks that extend the core assertions above:
[references/rtl-checks.md](references/rtl-checks.md) covers per-locale visual
regression (screenshots per RTL locale to catch un-mirrored padding, icons,
sidebars, and field order), CI integration across desktop and mobile profiles,
and `dirname` form-submission direction.

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| CSS-only direction                                                     | Per [w3-rtl][w3rtl]: "Do not use CSS to apply base direction."           | `dir="rtl"` on the `html` tag (Step 1). |
| Hardcoded `left` / `right` in CSS                                      | Doesn't mirror in RTL.                                                    | Logical properties (`start` / `end`) per [w3-rtl][w3rtl]. |
| Mirroring brand logos / icons with embedded text                       | Brand recognition + readability suffer.                                   | Per-asset decision; not all icons mirror. |
| Order numbers / IDs without `<bdi>` / `dir="ltr"` isolation             | Bidi heuristics may flip; "ORD-12345" becomes "12345-ORD".              | Wrap in `<bdi>` (Step 4). |
| Skipping per-locale visual regression                                  | Regressions visible only when RTL activated.                             | Per-locale screenshots (Step 6). |

## Limitations

- **Browser bidi heuristics vary.** Chrome / Firefox / Safari handle
  edge cases differently; per-browser tests recommended.
- **Translation quality affects test reliability.** Test
  translations should be real strings, not pseudo-loc, for accurate
  RTL behavior.
- **Some RTL languages have specific gotchas** (e.g., Persian uses
  Arabic script but Indo-European word order; Urdu has unique
  bidirectional patterns).

## References

- [w3rtl][w3rtl] - W3C on `dir` attribute, RTL effects, semantic
  vs CSS direction, `dirname` attribute.
- `pseudo-localization-runner` - sibling: layout-level i18n testing including RTL pseudo-loc
  variant.
- `i18n-string-coverage` - source-scan complement.
- `playwright-snapshots` - visual regression for catching RTL layout issues.
