'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildSessionCookie } = require('./cookie');

const anyRequest = { protocol: 'https', host: 'app.atlas.example', headers: {} };

test('the cookie carries the session id', () => {
  const header = buildSessionCookie({
    sid: 'abc123',
    config: { path: '/', sameSite: 'Strict' },
    req: anyRequest,
  });
  assert.match(header, /^sid=abc123;/);
});

test('the cookie is not readable from page scripts', () => {
  const header = buildSessionCookie({
    sid: 'abc123',
    config: { path: '/', sameSite: 'Strict' },
    req: anyRequest,
  });
  assert.match(header, /HttpOnly/);
});

test('the cookie is scoped to the app root', () => {
  const header = buildSessionCookie({
    sid: 'abc123',
    config: { path: '/', sameSite: 'Strict' },
    req: anyRequest,
  });
  assert.match(header, /Path=\//);
});

test('the builder emits the SameSite value it is given', () => {
  const header = buildSessionCookie({
    sid: 'abc123',
    config: { path: '/', sameSite: 'Strict' },
    req: anyRequest,
  });
  assert.match(header, /SameSite=Strict/);
});

test('the cookie is marked Secure over TLS', () => {
  const header = buildSessionCookie({
    sid: 'abc123',
    config: { path: '/', sameSite: 'Strict' },
    req: anyRequest,
  });
  assert.match(header, /Secure/);
});
