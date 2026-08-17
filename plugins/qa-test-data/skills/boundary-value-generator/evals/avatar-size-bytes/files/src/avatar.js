'use strict';

// Uploads are measured in bytes. The published limit of "5 MB" is stored
// binary: 5 MiB, i.e. 5 * 1024 * 1024 bytes. Anything under 1 KiB is treated
// as a truncated upload. Both limits are inclusive.
const MIN_BYTES = 1024; // 1 KiB
const MAX_BYTES = 5 * 1024 * 1024; // 5 MiB

function validateAvatar(byteLength) {
  if (!Number.isSafeInteger(byteLength) || byteLength < 0) {
    return { ok: false, code: 'BAD_BYTE_LENGTH' };
  }
  if (byteLength < MIN_BYTES) {
    return { ok: false, code: 'TOO_SMALL' };
  }
  if (byteLength > MAX_BYTES) {
    return { ok: false, code: 'TOO_LARGE' };
  }
  return { ok: true, code: null };
}

module.exports = { validateAvatar, MIN_BYTES, MAX_BYTES };
