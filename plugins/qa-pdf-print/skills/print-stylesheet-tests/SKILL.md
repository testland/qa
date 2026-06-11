---
name: print-stylesheet-tests
description: "Test CSS print-media output via Playwright `page.emulateMedia({ media: ''''print'''' })` + `page.pdf()` - `@page` rule (size, margin, orphans, widows), `@page :first / :left / :right` pseudo-classes, `break-before/after/inside`, `@media print` selector activation, page-break suppression on headings."
type: skill
rating: 23
d6: 4
keywords:
  - print-css
  - paged-media
  - playwright
  - emulateMedia
  - page-rule
---

# print-stylesheet-tests

Per [MDN Paged Media], CSS Paged Media defines `@page` rules and
break-control properties for print output. Per the [Playwright
page.pdf docs], `page.pdf()` "generates PDFs using `print` CSS media
by default" - call `emulateMedia` first if you want screen styles
applied to PDF instead.

## When to use

- App has a Print button or generates PDFs from Chromium.
- Print stylesheet exists but isn't tested - silent regressions
  cause customer complaints "the printed copy looks broken".
- Pre-deploy gate: page breaks fall in the right places, headers
  don't get orphaned at page bottom.

## Step 1 - Test `@media print` selectors activate

```ts
import { test, expect } from '@playwright/test';

test('navigation hidden when printing', async ({ page }) => {
  await page.goto('https://localhost:3000/invoice/inv_001');

  // Default media = screen → nav visible
  await expect(page.locator('nav.app-nav')).toBeVisible();

  // Switch to print
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('nav.app-nav')).toBeHidden();
});
```

`emulateMedia` activates `@media print` rules per [MDN Paged Media].

## Step 2 - Test print-only content appears

```ts
test('print-only legal footer appears under print media', async ({ page }) => {
  await page.goto('https://localhost:3000/invoice/inv_001');
  await expect(page.locator('.print-only-legal')).toBeHidden();

  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.print-only-legal')).toBeVisible();
});
```

## Step 3 - Generate PDF + verify @page size honored

```ts
test('PDF respects @page size: A4', async ({ page }) => {
  await page.goto('https://localhost:3000/invoice/inv_001');

  const pdf = await page.pdf({
    preferCSSPageSize: true,
  });

  // Use a PDF inspector lib or pair with pdf-snapshot-tester
  const dimensions = await getPdfDimensions(pdf);
  expect(dimensions.format).toBe('A4');
});
```

Per the [Playwright page.pdf docs]: `preferCSSPageSize: true` lets
CSS `@page { size: A4 }` win over the API `format` option. Without
it, API wins.

## Step 4 - Test page count

```ts
test('invoice fits on 1 page when standard line count', async ({ page }) => {
  await page.goto('https://localhost:3000/invoice/standard');
  const pdf = await page.pdf({ format: 'A4' });
  const pageCount = await getPdfPageCount(pdf);
  expect(pageCount).toBe(1);
});

test('invoice spills to 2 pages when many line items', async ({ page }) => {
  await page.goto('https://localhost:3000/invoice/long');
  const pdf = await page.pdf({ format: 'A4' });
  const pageCount = await getPdfPageCount(pdf);
  expect(pageCount).toBe(2);
});
```

Page count regressions ("invoice now needs 3 pages instead of 1") are
the canonical print bug.

## Step 5 - Test break-before / break-after / break-inside

CSS:

```css
@media print {
  h1.chapter { break-before: page; }
  table.totals { break-inside: avoid; }
  p { orphans: 3; widows: 3; }
}
```

Test that the chapter break shows up:

```ts
test('each chapter starts on new page', async ({ page }) => {
  await page.goto('https://localhost:3000/manual');
  const pdf = await page.pdf({ format: 'A4' });
  const pageTexts = await extractTextPerPage(pdf);

  // Chapter 1 on page 1, Chapter 2 on page 2, ...
  expect(pageTexts[0]).toContain('Chapter 1');
  expect(pageTexts[1]).toContain('Chapter 2');
});
```

## Step 6 - `@page :first` / `:left` / `:right` testing

Per [MDN Paged Media], pseudo-class selectors target specific
pages:

```css
@page :first {
  margin-top: 5cm;
  background: url(letterhead.png);
}
@page :left { margin-left: 3cm; margin-right: 2cm; }
@page :right { margin-left: 2cm; margin-right: 3cm; }
```

```ts
test('first page has letterhead margin', async ({ page }) => {
  await page.goto('https://localhost:3000/contract/c001');
  const pdf = await page.pdf({ format: 'A4', preferCSSPageSize: true });

  // Render page 1 to image, look for letterhead at top
  const page1 = await renderPdfPage(pdf, 1);
  expect(await hasLetterhead(page1)).toBe(true);
});
```

Pair with `pdf-snapshot-tester` for the rendered-page assertion.

## Step 7 - Margin verification

```ts
test('PDF generated with 2cm margins', async ({ page }) => {
  await page.goto('https://localhost:3000/letter');
  const pdf = await page.pdf({
    format: 'A4',
    margin: { top: '2cm', right: '2cm', bottom: '2cm', left: '2cm' },
  });

  const margins = await getPdfMargins(pdf);
  // Allow ±2mm rendering tolerance
  expect(margins.top).toBeCloseTo(20, 0);
});
```

Note: the Playwright `margin` API option overrides CSS `@page
margin` unless `preferCSSPageSize: true`.

## Step 8 - printBackground for branded headers

By default `printBackground: false` - backgrounds (gradients,
images) don't render. Customer-facing PDFs usually need
`printBackground: true`:

```ts
test('branded header background appears', async ({ page }) => {
  await page.goto('https://localhost:3000/branded-letter');
  const pdf = await page.pdf({
    printBackground: true,
    format: 'A4',
  });
  const page1 = await renderPdfPage(pdf, 1);
  expect(await hasBrandColorAtTop(page1)).toBe(true);
});
```

Per the [Playwright page.pdf docs]: `printBackground` defaults
false.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Test print stylesheet only by visually inspecting `page.pdf()` output | Regressions slip; not automated | Pair with `pdf-snapshot-tester` (Step 6) |
| Skip `preferCSSPageSize` when CSS owns layout | API options override; CSS `@page` ignored | `preferCSSPageSize: true` (Step 3) |
| Forget `printBackground: true` | Branded headers/colors missing in prod PDFs | Step 8 |
| Test only Chromium-rendered PDF | WeasyPrint / wkhtmltopdf differ; cross-engine bugs slip | `html-to-pdf-regression` skill covers cross-engine |
| Hard-code page-break tests against pixel positions | Slight font tweaks invalidate | Test text content per page (Step 5) |

## Limitations

- Playwright PDF generation uses Chromium's print path; WeasyPrint
  and wkhtmltopdf produce different output for the same HTML+CSS.
  Test the engine you actually ship with.
- `@page` `marks` and `bleeds` descriptors per [MDN Paged Media]
  have limited browser support.
- Some advanced @page features (running headers, generated content
  in page margins) are well-supported in WeasyPrint but limited in
  Chromium.

## References

- [MDN Paged Media] - `@page`, page pseudo-classes, break properties
- [Playwright page.pdf docs] - options, default print media,
  preferCSSPageSize, printBackground
- [`pdf-snapshot-tester`](../pdf-snapshot-tester/SKILL.md) - sister
  skill for pixel-diff assertions on rendered PDF pages
- [`html-to-pdf-regression`](../html-to-pdf-regression/SKILL.md) - 
  cross-engine HTML→PDF comparison

[MDN Paged Media]: https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Paged_media
[Playwright page.pdf docs]: https://playwright.dev/docs/api/class-page#page-pdf
