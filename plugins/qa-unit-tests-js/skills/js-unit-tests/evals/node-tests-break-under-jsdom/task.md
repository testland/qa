# Checksum tests die on a missing global

## Problem Description

`billing-api` is a Node service. It has always had a couple of tests around the
receipt widget we render into an email preview page, and those pass.

The new tests for `src/checksum.js` do not. Every one of them fails with
`ReferenceError: TextEncoder is not defined`, even though the module runs fine
in the service and in `node -e`. Nothing in `src/checksum.js` is unusual - it
encodes a JSON payload and hashes it.

The first suggestion on the ticket was to assign `TextEncoder` and
`TextDecoder` onto the global object from a setup file. That makes the error go
away, but the service is a backend and we would rather the tests ran the way
the code actually ships, instead of accumulating shims for whatever the runner
happens to be missing next.

## Output Specification

1. `npm test` runs green with both `src/checksum.test.js` and
   `src/receipt-widget.test.js` executing - neither skipped, neither deleted.
2. `src/checksum.js` must be exercised under the same runtime the service ships
   to, and `src/receipt-widget.js` must keep the browser globals its test needs.
3. Do not add or shim any global that the runtime does not already provide.
4. Do not change `src/checksum.js` or `src/receipt-widget.js`, do not weaken any
   existing assertion, and do not add packages to `package.json`.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "billing-api",
  "version": "3.1.0",
  "private": true,
  "scripts": {
    "test": "jest"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0"
  }
}

=============== FILE: jest.config.js ===============
module.exports = {
  testEnvironment: 'jsdom',
};

=============== FILE: src/checksum.js ===============
const { createHash } = require('node:crypto');

function checksum(payload) {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  return createHash('sha256').update(bytes).digest('hex');
}

function shortChecksum(payload) {
  return checksum(payload).slice(0, 12);
}

module.exports = { checksum, shortChecksum };

=============== FILE: src/checksum.test.js ===============
const { checksum, shortChecksum } = require('./checksum');

test('is stable for the same payload', () => {
  expect(checksum({ id: 7 })).toBe(checksum({ id: 7 }));
});

test('changes when the payload changes', () => {
  expect(checksum({ id: 7 })).not.toBe(checksum({ id: 8 }));
});

test('short form is the first twelve characters', () => {
  expect(shortChecksum({ id: 7 })).toBe(checksum({ id: 7 }).slice(0, 12));
});

=============== FILE: src/receipt-widget.js ===============
function renderReceipt(receipt) {
  const el = document.createElement('section');
  el.className = 'receipt';
  const heading = document.createElement('h2');
  heading.textContent = receipt.reference;
  const total = document.createElement('p');
  total.className = 'total';
  total.textContent = receipt.total;
  el.append(heading, total);
  return el;
}

module.exports = { renderReceipt };

=============== FILE: src/receipt-widget.test.js ===============
const { renderReceipt } = require('./receipt-widget');

test('renders the reference and the total', () => {
  const el = renderReceipt({ reference: 'INV-9', total: '24.00' });

  expect(el.querySelector('h2').textContent).toBe('INV-9');
  expect(el.querySelector('.total').textContent).toBe('24.00');
});
