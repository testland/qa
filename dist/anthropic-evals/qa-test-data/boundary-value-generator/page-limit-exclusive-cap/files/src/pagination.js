'use strict';

// Query parameters for the reports feed.
//   limit:  an integer, at least 1 and strictly less than 100. The cap itself
//           is not an accepted page size.
//   offset: an integer, at least 0. There is no product maximum; the only
//           ceiling is exact integer representation, so anything that is not
//           a safe integer is refused.
const MIN_LIMIT = 1;
const LIMIT_EXCLUSIVE_MAX = 100;

function parsePageParams(input) {
  if (!input || typeof input !== 'object') {
    return { ok: false, code: 'MALFORMED' };
  }
  const { limit, offset } = input;
  if (!Number.isInteger(limit)) {
    return { ok: false, code: 'LIMIT_NOT_INTEGER' };
  }
  if (limit < MIN_LIMIT) {
    return { ok: false, code: 'LIMIT_TOO_SMALL' };
  }
  if (limit >= LIMIT_EXCLUSIVE_MAX) {
    return { ok: false, code: 'LIMIT_TOO_LARGE' };
  }
  if (!Number.isSafeInteger(offset)) {
    return { ok: false, code: 'OFFSET_NOT_SAFE_INTEGER' };
  }
  if (offset < 0) {
    return { ok: false, code: 'OFFSET_NEGATIVE' };
  }
  return { ok: true, code: null, limit, offset };
}

module.exports = { parsePageParams, MIN_LIMIT, LIMIT_EXCLUSIVE_MAX };
