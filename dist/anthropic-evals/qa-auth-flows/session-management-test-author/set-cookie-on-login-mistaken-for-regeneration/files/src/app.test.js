'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('./app');

function sidFrom(response) {
  const header = (response.headers['set-cookie'] || [])[0] || '';
  return header.split(';')[0].split('=')[1];
}

test('the homepage issues a session cookie', () => {
  const app = createApp();
  const res = app.handle({ method: 'GET', path: '/' });
  assert.equal(res.status, 200);
  assert.ok(sidFrom(res));
});

test('the session cookie carries the required attributes', () => {
  const app = createApp();
  const header = app.handle({ method: 'GET', path: '/' }).headers['set-cookie'][0];
  assert.match(header, /HttpOnly/);
  assert.match(header, /Secure/);
  assert.match(header, /SameSite=Strict/);
  assert.match(header, /Max-Age=\d+/);
});

test('login issues a session cookie whose id is not the anonymous one', () => {
  const app = createApp();
  const anonymous = app.handle({ method: 'GET', path: '/' });
  const before = sidFrom(anonymous);

  const loggedIn = app.handle({
    method: 'POST',
    path: '/login',
    body: { user: 'l.whitcombe', pass: 'borrower2024' },
  });
  const after = sidFrom(loggedIn);

  assert.ok(after);
  assert.notEqual(after, before);
});

test('changing the password issues a different session id', () => {
  const app = createApp();
  const loggedIn = app.handle({
    method: 'POST',
    path: '/login',
    body: { user: 'p.nkemdirim', pass: 'fernwood!22' },
  });
  const sid = sidFrom(loggedIn);

  const changed = app.handle({
    method: 'POST',
    path: '/account/password',
    cookies: { sid },
    body: { pass: 'fernwood!23' },
  });

  assert.equal(changed.status, 200);
  assert.notEqual(sidFrom(changed), sid);
});

test('the dashboard is refused without a signed-in session', () => {
  const app = createApp();
  assert.equal(app.handle({ method: 'GET', path: '/dashboard' }).status, 401);
});

test('bad credentials are refused', () => {
  const app = createApp();
  const res = app.handle({
    method: 'POST',
    path: '/login',
    body: { user: 'l.whitcombe', pass: 'wrong' },
  });
  assert.equal(res.status, 401);
});
