'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { createEdge } = require('./edge');
const { origin } = require('./app');

const anon = (url) => ({ method: 'GET', url, session: null });

test('a real stylesheet is held at the edge for a year', () => {
  let now = 0;
  const edge = createEdge(origin, () => now);
  assert.equal(edge.request(anon('/assets/app.css')).servedFrom, 'origin');
  assert.equal(edge.request(anon('/assets/app.css')).servedFrom, 'edge');
  now = 31_535_000_000;
  assert.equal(edge.request(anon('/assets/app.css')).servedFrom, 'edge');
  assert.ok(edge.stored().includes('/assets/app.css'));
});

test('the script bundle is held at the edge for a year', () => {
  let now = 0;
  const edge = createEdge(origin, () => now);
  assert.equal(edge.request(anon('/assets/app.js')).servedFrom, 'origin');
  now = 31_535_000_000;
  assert.equal(edge.request(anon('/assets/app.js')).servedFrom, 'edge');
});

test('the logo is held at the edge for a year as well', () => {
  let now = 0;
  const edge = createEdge(origin, () => now);
  assert.equal(edge.request(anon('/assets/logo.png')).servedFrom, 'origin');
  now = 31_535_000_000;
  assert.equal(edge.request(anon('/assets/logo.png')).servedFrom, 'edge');
});

test('the statement page itself is never held at the edge', () => {
  const edge = createEdge(origin);
  const req = { method: 'GET', url: '/account/statement', session: { accountId: 'acct-4180' } };
  assert.match(edge.request(req).body, /Priya Raman/);
  assert.equal(edge.request(req).servedFrom, 'origin');
  assert.equal(edge.stored().length, 0);
});

test('a marketing page is held for the five minutes the origin asked for', () => {
  let now = 0;
  const edge = createEdge(origin, () => now);
  assert.equal(edge.request(anon('/site/pricing')).servedFrom, 'origin');
  assert.equal(edge.request(anon('/site/pricing')).servedFrom, 'edge');
  now = 300_001;
  assert.equal(edge.request(anon('/site/pricing')).servedFrom, 'origin');
});

test('an unknown path is a 404 and is not held', () => {
  const edge = createEdge(origin);
  assert.equal(edge.request(anon('/nothing/here')).status, 404);
  assert.equal(edge.stored().length, 0);
});
