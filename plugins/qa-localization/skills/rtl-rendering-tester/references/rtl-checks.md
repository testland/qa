# Supplementary RTL checks

Extends the core direction assertions in SKILL.md (dir attribute, text
alignment, icon mirroring, bidi isolation, form input start).

## Per-locale visual regression

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

## CI integration

```yaml
- name: RTL rendering tests
  run: npx playwright test e2e/rtl/ --project=mobile-iphone-15 --project=desktop-chromium
- uses: actions/upload-artifact@v4
  if: failure()
  with:
    name: rtl-screenshots
    path: test-results/
```

Run on both desktop and mobile profiles - RTL handling can differ per breakpoint.

## `dirname` for form submission

Per [w3-rtl][w3rtl]: "Use `dir='auto'` to automatically detect text direction
from the first strongly-typed character. Pair with the `dirname` attribute to
send information about direction to the server in addition to the usual form
data."

Verify forms submitted from RTL contexts include the direction information when
needed:

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

[w3rtl]: https://www.w3.org/International/questions/qa-html-dir
