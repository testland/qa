'use strict';

const fs = require('node:fs');
const { parseArgs } = require('node:util');
const { By, until } = require('selenium-webdriver');
const { startSession, endSession, markFailed } = require('./support/session');

const { values } = parseArgs({
  options: { browser: { type: 'string', default: 'chrome' } },
});

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// first two of the 41 specs; the other 39 follow the same shape
const specs = [
  {
    name: 'home page renders',
    run: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(By.css('[data-testid=hero]')), 10000);
    },
  },
  {
    name: 'add to cart from the product page',
    run: async (driver) => {
      await driver.get(`${BASE_URL}/products/BOOK-001`);
      const add = await driver.wait(
        until.elementIsEnabled(await driver.findElement(By.css('[data-testid=add-to-cart]'))),
        10000
      );
      await add.click();
      const count = await driver.findElement(By.css('[data-testid=cart-count]'));
      if ((await count.getText()) !== '1') throw new Error('cart count did not reach 1');
    },
  },
];

async function main() {
  const results = [];
  for (const spec of specs) {
    const driver = await startSession(spec.name);
    try {
      await spec.run(driver);
      results.push({ name: spec.name, ok: true });
    } catch (err) {
      markFailed();
      results.push({ name: spec.name, ok: false, error: String(err) });
    } finally {
      await endSession();
    }
  }

  const passed = results.filter((r) => r.ok).length;
  console.log(`${values.browser}: ${passed}/${results.length} passed`);
  fs.mkdirSync('reports', { recursive: true });
  fs.writeFileSync(
    `reports/${values.browser}.json`,
    JSON.stringify({ browser: values.browser, passed, total: results.length, results }, null, 2)
  );
  process.exitCode = passed === results.length ? 0 : 1;
}

main();
