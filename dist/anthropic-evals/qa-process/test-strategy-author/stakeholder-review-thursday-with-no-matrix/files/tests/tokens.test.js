import test from 'node:test';
import assert from 'node:assert/strict';
import { mintToken, authorise } from '../src/tokens.js';

test('mints a token carrying the requested scopes', () => {
  const t = mintToken('ws_1', ['query:read']);
  assert.deepEqual(t.scopes, ['query:read']);
});

test('rejects an unknown scope', () => {
  assert.throws(() => mintToken('ws_1', ['query:delete']), /unknown scope/);
});

test('authorises a token for its own workspace and scope', () => {
  const t = mintToken('ws_1', ['query:read']);
  assert.equal(authorise(t, 'ws_1', 'query:read'), true);
});

test('refuses a token against another workspace', () => {
  const t = mintToken('ws_1', ['query:read']);
  assert.equal(authorise(t, 'ws_2', 'query:read'), false);
});
