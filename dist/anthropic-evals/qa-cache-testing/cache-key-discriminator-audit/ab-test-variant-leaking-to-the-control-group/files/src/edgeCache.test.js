'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { createEdgeCache } = require('./edgeCache');

const req = (headers = {}) => ({
  method: 'GET',
  url: '/pricing',
  headers: { host: 'shop.example.com', ...headers },
});

const res = (body, headers = {}) => ({
  status: 200,
  headers: { 'cache-control': 'public, max-age=600', ...headers },
  body,
});

test('a stored response is reused for an identical request', () => {
  const cache = createEdgeCache();
  cache.store(req(), res('one'));
  assert.equal(cache.lookup(req()).body, 'one');
});

test('Vary separates entries by the nominated request header', () => {
  const cache = createEdgeCache();
  cache.store(req({ 'accept-language': 'en' }), res('hello', { vary: 'Accept-Language' }));
  assert.equal(cache.lookup(req({ 'accept-language': 'en' })).body, 'hello');
  assert.equal(cache.lookup(req({ 'accept-language': 'fr' })), null);
});

test('a private response is never stored at the edge', () => {
  const cache = createEdgeCache();
  assert.equal(cache.store(req(), res('secret', { 'cache-control': 'private, max-age=600' })), false);
  assert.equal(cache.lookup(req()), null);
});

test('an expired entry is not reused', () => {
  let now = 0;
  const cache = createEdgeCache(() => now);
  cache.store(req(), res('one'));
  now = 600_001;
  assert.equal(cache.lookup(req()), null);
});
