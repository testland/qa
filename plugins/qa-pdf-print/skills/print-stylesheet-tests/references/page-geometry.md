# @page pseudo-classes and margins

## @page :first / :left / :right testing

Per [MDN Paged Media], pseudo-class selectors target specific pages:

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

## Margin verification

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

Note: the Playwright `margin` API option overrides CSS `@page margin`
unless `preferCSSPageSize: true`.

[MDN Paged Media]: https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Paged_media
