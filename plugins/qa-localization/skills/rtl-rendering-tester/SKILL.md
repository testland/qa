---
name: rtl-rendering-tester
description: "Build-an-X workflow for verifying RTL (right-to-left) layouts - runs the test suite under Arabic / Hebrew / Persian / Urdu locales, asserts the `dir=\"rtl\"` attribute is set, verifies layout mirrors correctly (text alignment, icon positions, scrollbar location), uses logical CSS properties (`start`/`end` over `left`/`right`) per W3C guidance, captures per-locale screenshots for visual review. Use when the app supports RTL languages."
---

# rtl-rendering-tester

## Overview

Per [w3-rtl][w3rtl]:

[w3rtl]: https://www.w3.org/International/questions/qa-html-dir

> "If the overall document direction is right-to-left, add
> `dir='rtl'` to the `html` tag."

The `dir` attribute is the standard way to signal direction. Per
[w3-rtl][w3rtl], it affects:

> - Paragraphs and blocks align right
> - Bidirectional text flows correctly right-to-left
> - Punctuation appears in correct positions
> - Table columns progress right-to-left
> - Form inputs start at the right by default

Common RTL languages: Arabic, Hebrew, Persian, Urdu.

This skill verifies the app handles RTL correctly.

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

Common RTL gotchas:

- **Back / forward arrows:** must mirror (← → in LTR becomes → ←
  in RTL).
- **Pagination arrows:** mirror.
- **Chevrons indicating direction:** mirror.
- **Logos / brand icons:** typically do **not** mirror.
- **Icons with embedded text:** typically do not mirror (would
  flip the text).

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

## Step 6 - Per-locale visual regression

```typescript
test('home page Arabic snapshot', async ({ page }) => {
  await page.goto('/?lng=ar');
  await expect(page).toHaveScreenshot('home-ar.png');
});

test('home page Hebrew snapshot', async ({ page }) => {
  await page.goto('/?lng=he');
  await expect(page).toHaveScreenshot('home-he.png');
});
```

RTL screenshots catch regressions like:

- Text overflowing because RTL didn't auto-mirror padding.
- Icons not mirrored.
- Sidebar on the wrong side.
- Form fields in the wrong order.

## Step 7 - CI integration

```yaml
- name: RTL rendering tests
  run: npx playwright test e2e/rtl/ --project=mobile-iphone-15 --project=desktop-chromium
- uses: actions/upload-artifact@v4
  if: failure()
  with:
    name: rtl-screenshots
    path: test-results/
```

Run on both desktop and mobile profiles - RTL handling can differ
per breakpoint.

## Step 8 - `dirname` for form submission

Per [w3-rtl][w3rtl]: "Use `dir='auto'` to automatically detect
text direction from the first strongly-typed character. Pair with
the `dirname` attribute to send information about direction to the
server in addition to the usual form data."

Verify forms submitted from RTL contexts include the direction
information when needed:

```typescript
test('comment form sends direction with submission', async ({ page }) => {
  await page.goto('/post/123?lng=ar');
  await page.getByLabel(/comment/i).fill('مرحبا - hello');
  // Listen for the form submission
  const responsePromise = page.waitForResponse('/api/comments');
  await page.getByRole('button', { name: /submit/i }).click();
  const response = await responsePromise;
  // The form's `dirname` attribute should send a separate field with the direction
  expect(response.request().postData()).toContain('comment.dir=rtl');
});
```

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
- [`pseudo-localization-runner`](../pseudo-localization-runner/SKILL.md) - sibling: layout-level i18n testing including RTL pseudo-loc
  variant.
- [`i18n-string-coverage`](../i18n-string-coverage/SKILL.md) - 
  source-scan complement.
- `playwright-snapshots` - visual regression for catching RTL layout issues.
