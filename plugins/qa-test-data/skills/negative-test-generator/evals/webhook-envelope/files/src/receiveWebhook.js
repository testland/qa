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
