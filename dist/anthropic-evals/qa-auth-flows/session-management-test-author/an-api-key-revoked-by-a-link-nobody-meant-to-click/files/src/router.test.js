'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('./router');

test('a request with no session is refused', () => {
  const app = createApp();
  const res = app.handle({ method: 'GET', path: '/account/keys', cookies: {} });
  assert.equal(res.status, 401);
});

test('the key list shows a customer only their own keys', () => {
  const app = createApp();
  const sid = app.login('w.mbeki');
  const res = app.handle({ method: 'GET', path: '/account/keys', cookies: { sid } });
  assert.deepEqual(
    res.body.keys.map((k) => k.id),
    ['k_8812', 'k_9043'],
  );
});

test('the export endpoint returns the account plan', () => {
  const app = createApp();
  const sid = app.login('w.mbeki');
  const res = app.handle({ method: 'GET', path: '/account/export', cookies: { sid } });
  assert.equal(res.status, 200);
  assert.equal(res.body.plan, 'growth');
});

test('changing plan without a token is refused', () => {
  const app = createApp();
  const sid = app.login('w.mbeki');
  const res = app.handle({
    method: 'POST',
    path: '/billing/plan',
    query: { plan: 'scale' },
    cookies: { sid },
    headers: {},
  });
  assert.equal(res.status, 403);
});

test('changing plan with the session token succeeds', () => {
  const app = createApp();
  const sid = app.login('w.mbeki');
  const res = app.handle({
    method: 'POST',
    path: '/billing/plan',
    query: { plan: 'scale' },
    cookies: { sid },
    headers: { 'x-csrf-token': app.csrfTokenFor(sid) },
  });
  assert.equal(res.status, 200);
  assert.equal(app.planFor('w.mbeki'), 'scale');
});
