'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { requireAuth } = require('../src/require-auth.js');

// Stand-in for the SSO server. `answer` is what it replies with.
function startFakeIdp(answer) {
  const payload = answer || {
    active: true,
    preferred_username: 'ada',
    aud: 'orders-api',
    exp: 4102444800,
  };
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(payload));
      });
    });
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, url: 'http://127.0.0.1:' + server.address().port });
    });
  });
}

function opts(url) {
  return { idpBaseUrl: url, realm: 'corp', clientId: 'orders-api', clientSecret: 'shhh' };
}

test('a bearer token is accepted', async (t) => {
  const idp = await startFakeIdp();
  t.after(() => idp.server.close());

  const out = await requireAuth({ authorization: 'Bearer good-token' }, opts(idp.url));
  assert.equal(out.status, 200);
  assert.equal(out.body.user, 'ada');
});

test('an expired token is refused', async (t) => {
  const idp = await startFakeIdp({
    active: true,
    preferred_username: 'ada',
    aud: 'orders-api',
    exp: 1757435462,
  });
  t.after(() => idp.server.close());

  const out = await requireAuth({ authorization: 'Bearer stale-token' }, opts(idp.url));
  assert.equal(out.status, 401);
  assert.equal(out.body.error, 'token_expired');
});

test('a request with no Authorization header is refused', async (t) => {
  const idp = await startFakeIdp();
  t.after(() => idp.server.close());

  const out = await requireAuth({}, opts(idp.url));
  assert.equal(out.status, 401);
  assert.equal(out.body.error, 'missing_token');
});

test('a non-Bearer Authorization header is refused', async (t) => {
  const idp = await startFakeIdp();
  t.after(() => idp.server.close());

  const out = await requireAuth({ authorization: 'Basic YWRhOnMzY3JldA==' }, opts(idp.url));
  assert.equal(out.status, 401);
  assert.equal(out.body.error, 'missing_token');
});
