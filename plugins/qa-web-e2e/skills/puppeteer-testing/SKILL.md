---
name: puppeteer-testing
description: "Authors browser automation scripts using Puppeteer — Chrome / Chromium-only headless / headed automation, Page object via `page.*` API, network interception, PDF generation, screenshot capture, scraping. Distinct from Playwright (Puppeteer's older sibling, Chrome-only) — use Puppeteer for Chrome-only browser automation tasks (scraping, generating PDFs from HTML, screenshot pipelines) where Playwright's multi-browser support is unneeded overhead."
rating: 22
d6: 3
archetype: S1
---

# puppeteer-testing

## Overview

Puppeteer is Google's Node library for controlling Chrome /
Chromium via the DevTools Protocol. It predates Playwright;
Playwright's authors are former Puppeteer maintainers who left
Google to build a multi-browser successor.

Puppeteer is still maintained and useful when:
- Chrome-only is fine.
- Browser-automation use cases beyond E2E testing dominate
  (scraping, PDF generation, screenshot pipelines, web crawling).
- Lightweight footprint matters (no test runner bundled).

## When to use

- Chrome-only automation (no Firefox / WebKit needed).
- Use cases beyond E2E testing: scraping, PDF generation,
  screenshot capture, automated browsing for crawlers.
- Existing Puppeteer codebase; migration cost prohibitive.

For E2E testing specifically: **Playwright is the recommended
successor**. Migration is mostly mechanical (similar API).

## Step 1 — Install

```bash
npm install --save-dev puppeteer
# Auto-downloads matching Chromium

# Or for Chrome-bring-your-own:
npm install --save-dev puppeteer-core
```

`puppeteer` (full) bundles Chromium; `puppeteer-core` (lite) lets
you point at an existing Chrome.

## Step 2 — Basic browser automation

```javascript
// scripts/screenshot.js
import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.goto('https://example.com');
  await page.screenshot({ path: 'example.png', fullPage: true });
  await browser.close();
})();
```

The `page.*` API mirrors Playwright's: `page.goto`, `page.click`,
`page.type`, `page.evaluate`, etc.

## Step 3 — E2E test (with Jest)

```javascript
// __tests__/checkout.test.js
import puppeteer from 'puppeteer';

let browser, page;

beforeAll(async () => {
  browser = await puppeteer.launch({ headless: 'new' });
});

beforeEach(async () => {
  page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
});

afterEach(async () => {
  await page.close();
});

afterAll(async () => {
  await browser.close();
});

test('checkout flow', async () => {
  await page.goto('http://localhost:3000/login');
  await page.type('[data-testid=email]', 'user@example.com');
  await page.type('[data-testid=password]', 'pwd');
  await page.click('button[type=submit]');

  await page.waitForSelector('h1');
  const heading = await page.$eval('h1', el => el.textContent);
  expect(heading).toContain('Welcome');
}, 60000);
```

## Step 4 — Network interception

```javascript
// Intercept and modify requests
await page.setRequestInterception(true);

page.on('request', request => {
  if (request.url().includes('/api/orders')) {
    request.respond({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ orderId: 'TEST-1234', total: 24.99 }),
    });
  } else {
    request.continue();
  }
});
```

Useful for stubbing third-party APIs in tests or mocking
responses.

## Step 5 — PDF generation

```javascript
import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.goto('https://example.com/invoice/123');
  await page.pdf({
    path: 'invoice-123.pdf',
    format: 'A4',
    margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
    printBackground: true,
  });
  await browser.close();
})();
```

Common production use: server-side PDF generation from HTML
templates.

## Step 6 — Screenshot pipelines

```javascript
// Generate screenshots for marketing site at multiple viewports
const viewports = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 720 },
];

for (const vp of viewports) {
  await page.setViewport(vp);
  await page.goto('https://example.com');
  await page.screenshot({ path: `screenshots/${vp.name}.png`, fullPage: true });
}
```

## Step 7 — Web scraping

```javascript
await page.goto('https://example.com/products');

const products = await page.$$eval('.product-card', cards =>
  cards.map(card => ({
    name: card.querySelector('.product-name')?.textContent.trim(),
    price: card.querySelector('.product-price')?.textContent.trim(),
    url: card.querySelector('a')?.href,
  }))
);

console.log(products);
```

## Step 8 — Run

```bash
node scripts/screenshot.js

# Or as part of test suite
npx jest
```

## Step 9 — Migration to Playwright

When ready to migrate:

```javascript
// Puppeteer
const browser = await puppeteer.launch();
const page = await browser.newPage();

// Playwright equivalent
const browser = await chromium.launch();
const page = await browser.newPage();
```

The APIs are similar; mechanical find-replace covers most cases.
Playwright adds: cross-browser, web-first assertions, trace viewer,
codegen — net win unless Chrome-only is intentional.

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Using Puppeteer for cross-browser E2E                                  | Chrome-only; misses Firefox / Safari regressions.                       | Playwright for cross-browser. |
| Forgetting `browser.close()`                                            | Browser process leaks; CI runner OOM.                                    | `afterAll` cleanup (Step 3). |
| `page.waitFor(2000)`                                                    | Flaky; deprecated.                                                        | `page.waitForSelector` / `waitForFunction`. |
| Running headed in CI                                                    | No display; crashes.                                                      | `headless: 'new'` (Step 2). |
| `puppeteer-core` without specifying executable                         | "browser not found" errors.                                               | Use `puppeteer` (bundled) OR specify `executablePath`. |

## Limitations

- **Chrome / Chromium only.** No Firefox / WebKit.
- **No bundled test runner.** Pair with Jest / Mocha / Vitest.
- **No web-first assertions.** Manual `waitForSelector` patterns.
- **Maintenance pace slower than Playwright.** Active but not
  expanding.

## References

- Puppeteer docs at `pptr.dev`.
- [`playwright-testing`](../playwright-testing/SKILL.md) —
  recommended successor.
- [`testcafe-testing`](../testcafe-testing/SKILL.md) — alternative
  Chrome-friendly E2E.
