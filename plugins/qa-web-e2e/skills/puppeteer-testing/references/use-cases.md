# Puppeteer use-case recipes

Specialized `page.*` recipes beyond the core automation and E2E spine in
[SKILL.md](../SKILL.md). Each drives Chrome / Chromium over the DevTools
Protocol and runs as a standalone script or test body.

## Network interception

Stub third-party APIs or mock responses in tests:

```javascript
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

## PDF generation

Common production use: server-side PDF from an HTML template.

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

## Screenshot pipelines

Capture one page at multiple viewports:

```javascript
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

## Web scraping

Extract structured data with `$$eval`:

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
