const test = require('node:test');
const assert = require('node:assert/strict');
const { collectUrls } = require('../lib/urls.js');

test('collects only the routes marked for lighthouse', () => {
  const urls = collectUrls('http://localhost:3000');
  assert.deepEqual(urls, [
    'http://localhost:3000/',
    'http://localhost:3000/product',
    'http://localhost:3000/checkout',
    'http://localhost:3000/account/orders',
  ]);
});
