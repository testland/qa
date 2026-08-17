# Tests cannot resolve the imports the app resolves fine

## Problem Description

Our source uses short prefixes for internal imports - `@lib/...` and
`@config/...` - declared in `jsconfig.json`. The bundler reads that file, so the
app builds and runs, and the editor jumps to definition correctly.

The runner does not. `src/report.test.js` dies before a single assertion:

```
Cannot find module '@lib/money' from 'src/report.js'
```

`src/lib/money.test.js` passes, because that file happens to import its
neighbour with a relative path.

Rewriting the two imports inside `src/report.js` to `./lib/money` and
`./config/defaults` makes the failure go away, but we have about forty modules
using these prefixes and more arriving every week, so we are not doing that
forty times.

## Output Specification

1. `npm test` runs green, with both test files executing.
2. Any module using `@lib/...` or `@config/...` must be importable from a test
   without further changes - including modules added after this task.
3. Extend `src/report.test.js` with cases for an empty line list and for a VAT
   amount that has to round.
4. Do not change the import statements in `src/report.js` or any other file
   under `src/`, do not change behaviour in any source module, and do not add
   packages to `package.json`.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "reports",
  "version": "0.9.2",
  "private": true,
  "scripts": {
    "test": "jest"
  },
  "devDependencies": {
    "jest": "^29.7.0"
  }
}

=============== FILE: jsconfig.json ===============
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@lib/*": ["src/lib/*"],
      "@config/*": ["src/config/*"]
    }
  }
}

=============== FILE: jest.config.js ===============
module.exports = {
  testEnvironment: 'node',
};

=============== FILE: src/config/defaults.js ===============
module.exports = { currency: 'EUR', vatRate: 0.19 };

=============== FILE: src/lib/money.js ===============
function toCents(amount) {
  return Math.round(amount * 100);
}

function formatCents(cents, currency) {
  return `${(cents / 100).toFixed(2)} ${currency}`;
}

module.exports = { toCents, formatCents };

=============== FILE: src/lib/money.test.js ===============
const { toCents, formatCents } = require('./money');

test('converts an amount to whole cents', () => {
  expect(toCents(12.34)).toBe(1234);
});

test('formats cents with the currency code', () => {
  expect(formatCents(2000, 'EUR')).toBe('20.00 EUR');
});

=============== FILE: src/report.js ===============
const { toCents, formatCents } = require('@lib/money');
const defaults = require('@config/defaults');

function summarize(lines) {
  const netCents = lines.reduce((sum, line) => sum + toCents(line.amount), 0);
  const vatCents = Math.round(netCents * defaults.vatRate);

  return {
    net: formatCents(netCents, defaults.currency),
    vat: formatCents(vatCents, defaults.currency),
    gross: formatCents(netCents + vatCents, defaults.currency),
  };
}

module.exports = { summarize };

=============== FILE: src/report.test.js ===============
const { summarize } = require('./report');

test('totals the lines and adds VAT', () => {
  const out = summarize([{ amount: 100 }, { amount: 50 }]);

  expect(out.net).toBe('150.00 EUR');
  expect(out.vat).toBe('28.50 EUR');
  expect(out.gross).toBe('178.50 EUR');
});
