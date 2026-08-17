# Webhook endpoint answers every bad request the same way in our tests

## Problem Description

`src/receiveWebhook.js` is the entry point for partner webhooks. It works on
the raw request - headers plus the unparsed body string - because the
signature covers the exact bytes we received.

The checks run in a fixed order for a reason. We refuse a body we are not
willing to read before we read it, and we verify the signature before handing
anything to the parser, so a hostile sender cannot reach `JSON.parse` at all.
Partners integrate against the specific statuses: their retry logic backs off
on some and gives up on others.

Support spent a week on a partner whose payloads were rejected while their
staging traffic worked. The cause was a body under our character limit but
over our byte limit once accented characters were counted. Our suite has one
test - a correctly signed ping is accepted.

## Output Specification

1. Add `src/receiveWebhook.test.js` covering the rejection paths, including
   the order in which the checks apply.
2. A change that answered a rejected request with a different status, or that
   parsed a body it should have refused first, must fail the suite.
3. Do not modify `src/receiveWebhook.js`; its current behaviour is the
   specification.
4. Leave `src/receiveWebhook.happy.test.js` in place.
5. Run `npm test` before you finish; it must pass.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "partner-webhooks",
  "version": "6.2.0",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/receiveWebhook.js ===============
'use strict';

const MAX_BYTES = 64;
const SECRET = 'whsec_test';

function sign(rawBody) {
  let hash = 5381;
  const input = `${SECRET}.${rawBody}`;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash * 33) ^ input.charCodeAt(i)) >>> 0;
  }
  return `v1=${hash.toString(16)}`;
}

function receiveWebhook(request) {
  const headers = {};
  for (const [name, value] of Object.entries((request && request.headers) || {})) {
    headers[name.toLowerCase()] = value;
  }
  const raw = request && typeof request.rawBody === 'string' ? request.rawBody : '';

  const contentType = headers['content-type'];
  if (contentType === undefined) {
    return { status: 415, code: 'CONTENT_TYPE_MISSING' };
  }
  const parts = String(contentType).split(';').map((part) => part.trim().toLowerCase());
  if (parts[0] !== 'application/json') {
    return { status: 415, code: 'MEDIA_TYPE_UNSUPPORTED' };
  }
  const charset = parts.slice(1).find((part) => part.startsWith('charset='));
  if (charset !== undefined && charset !== 'charset=utf-8') {
    return { status: 415, code: 'CHARSET_UNSUPPORTED' };
  }

  if (headers['content-length'] === undefined) {
    return { status: 411, code: 'CONTENT_LENGTH_REQUIRED' };
  }
  const byteLength = Buffer.byteLength(raw, 'utf8');
  if (Number(headers['content-length']) !== byteLength) {
    return { status: 400, code: 'CONTENT_LENGTH_MISMATCH' };
  }
  if (byteLength > MAX_BYTES) {
    return { status: 413, code: 'PAYLOAD_TOO_LARGE' };
  }

  if (headers['x-signature'] !== sign(raw)) {
    return { status: 401, code: 'SIGNATURE_INVALID' };
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return { status: 400, code: 'BODY_NOT_JSON' };
  }
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    return { status: 422, code: 'BODY_NOT_AN_OBJECT' };
  }
  if (typeof payload.event !== 'string') {
    return { status: 422, code: 'EVENT_REQUIRED' };
  }
  return { status: 202, code: null, event: payload.event };
}

module.exports = { receiveWebhook, sign, MAX_BYTES };

=============== FILE: src/receiveWebhook.happy.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { receiveWebhook, sign } = require('./receiveWebhook');

test('accepts a signed json webhook', () => {
  const rawBody = '{"event":"ping"}';
  const result = receiveWebhook({
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': String(Buffer.byteLength(rawBody, 'utf8')),
      'X-Signature': sign(rawBody),
    },
    rawBody,
  });
  assert.equal(result.status, 202);
  assert.equal(result.event, 'ping');
});
