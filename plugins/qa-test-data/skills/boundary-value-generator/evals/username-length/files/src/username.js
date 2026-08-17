'use strict';

const MIN_LENGTH = 3;
const MAX_LENGTH = 20;
const ALLOWED = /^[a-z0-9_]+$/;

function validateUsername(value) {
  if (typeof value !== 'string') {
    return { ok: false, code: 'NOT_STRING' };
  }
  if (value.length < MIN_LENGTH) {
    return { ok: false, code: 'TOO_SHORT' };
  }
  if (value.length > MAX_LENGTH) {
    return { ok: false, code: 'TOO_LONG' };
  }
  if (!ALLOWED.test(value)) {
    return { ok: false, code: 'BAD_CHARS' };
  }
  return { ok: true, code: null };
}

module.exports = { validateUsername, MIN_LENGTH, MAX_LENGTH };
