'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildSessionCookie } = require('./cookie');
const { productionRequest, developmentRequest } = require('./requests');
const production = require('../config/production.json');
const development = require('../config/development.json');

test('the cookie carries the session id', () => {
  const header = buildSessionCookie({ sid: 'abc123', config: production, req: productionRequest });
  assert.match(header, /^sid=abc123;/);
});

test('the cookie is not readable from page scripts', () => {
  const header = buildSessionCookie({ sid: 'abc123', config: production, req: productionRequest });
  assert.match(header, /HttpOnly/);
});

test('the cookie is scoped to the app root', () => {
  const header = buildSessionCookie({ sid: 'abc123', config: production, req: productionRequest });
  assert.match(header, /Path=\//);
});

test('the builder emits the SameSite value it is given', () => {
  const header = buildSessionCookie({
    sid: 'abc123',
    config: { path: '/', sameSite: 'Strict' },
    req: productionRequest,
  });
  assert.match(header, /SameSite=Strict/);
});

test('local development still gets a usable cookie', () => {
  const header = buildSessionCookie({ sid: 'abc123', config: development, req: developmentRequest });
  assert.match(header, /^sid=abc123;/);
});
