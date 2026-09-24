const test = require('node:test');
const assert = require('node:assert');
const crypto = require('node:crypto');
const { verifyWebhook, parseSignatureHeader } = require('../server/handlers/webhooks.js');

const SECRET = 'whsec_test_only';

function sign(body, ts) {
  return crypto.createHmac('sha256', SECRET).update(ts + '.' + body).digest('hex');
}

test('accepts a correctly signed recent payload', () => {
  const ts = 1757400000;
  const body = '{"id":"evt_1"}';
  const header = 't=' + ts + ',v1=' + sign(body, ts);
  assert.deepStrictEqual(verifyWebhook(body, header, SECRET, ts + 10), { ok: true });
});

test('rejects a payload outside the tolerance window', () => {
  const ts = 1757400000;
  const body = '{"id":"evt_1"}';
  const header = 't=' + ts + ',v1=' + sign(body, ts);
  const res = verifyWebhook(body, header, SECRET, ts + 400);
  assert.strictEqual(res.ok, false);
  assert.match(res.reason, /tolerance/);
});

test('rejects a tampered body', () => {
  const ts = 1757400000;
  const header = 't=' + ts + ',v1=' + sign('{"id":"evt_1"}', ts);
  assert.strictEqual(verifyWebhook('{"id":"evt_2"}', header, SECRET, ts).ok, false);
});

test('header parsing splits the comma-separated parts', () => {
  assert.deepStrictEqual(parseSignatureHeader('t=1,v1=abc'), { t: '1', v1: 'abc' });
});
