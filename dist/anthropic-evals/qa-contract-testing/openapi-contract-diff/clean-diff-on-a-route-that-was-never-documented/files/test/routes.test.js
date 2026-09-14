import test from 'node:test';
import assert from 'node:assert/strict';
import { handle, reset } from '../src/routes.mjs';

test('creating a webhook returns the created record with its secret', () => {
  reset();
  const res = handle('POST', '/v1/webhooks', { url: 'https://northwind.example/hooks' });
  assert.equal(res.status, 201);
  assert.equal(res.body.url, 'https://northwind.example/hooks');
  assert.match(res.body.id, /^wh_/);
  assert.match(res.body.secret, /^whsec_/);
});

test('disabling a webhook flips the flag and keeps the record', () => {
  reset();
  const created = handle('POST', '/v1/webhooks', { url: 'https://northwind.example/hooks' });
  const res = handle('POST', `/v1/webhooks/${created.body.id}/disable`, {});
  assert.equal(res.status, 200);
  assert.equal(res.body.disabled, true);
  assert.equal(handle('GET', `/v1/webhooks/${created.body.id}`).status, 200);
});

test('listing returns every webhook that was created', () => {
  reset();
  handle('POST', '/v1/webhooks', { url: 'https://a.example/hooks' });
  handle('POST', '/v1/webhooks', { url: 'https://b.example/hooks' });
  const res = handle('GET', '/v1/webhooks');
  assert.equal(res.status, 200);
  assert.equal(res.body.length, 2);
});
