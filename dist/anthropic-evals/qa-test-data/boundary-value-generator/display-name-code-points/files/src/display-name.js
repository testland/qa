'use strict';

// Product limit: a display name holds 1 to 24 characters, where a character
// means one Unicode code point. Both endpoints are included.
// Storage limit: the column holds 40 UTF-16 code units, inclusive. It is
// checked only after the product limit passes.
const MIN_CODE_POINTS = 1;
const MAX_CODE_POINTS = 24;
const MAX_UTF16_UNITS = 40;

function validateDisplayName(value) {
  if (typeof value !== 'string') {
    return { ok: false, code: 'NOT_A_STRING', codePoints: null, utf16Units: null };
  }
  const codePoints = Array.from(value).length;
  const utf16Units = value.length;
  if (codePoints < MIN_CODE_POINTS) {
    return { ok: false, code: 'TOO_SHORT', codePoints, utf16Units };
  }
  if (codePoints > MAX_CODE_POINTS) {
    return { ok: false, code: 'TOO_LONG', codePoints, utf16Units };
  }
  if (utf16Units > MAX_UTF16_UNITS) {
    return { ok: false, code: 'STORAGE_OVERFLOW', codePoints, utf16Units };
  }
  return { ok: true, code: null, codePoints, utf16Units };
}

module.exports = {
  validateDisplayName,
  MIN_CODE_POINTS,
  MAX_CODE_POINTS,
  MAX_UTF16_UNITS,
};
