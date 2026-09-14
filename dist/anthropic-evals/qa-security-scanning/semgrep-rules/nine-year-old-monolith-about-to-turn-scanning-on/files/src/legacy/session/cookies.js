'use strict';

const DEFAULT_MAX_AGE_MS = 1000 * 60 * 60 * 12;

function buildSessionCookie(sid, opts = {}) {
  const parts = ['atlas_sid=' + encodeURIComponent(sid)];
  parts.push('Path=' + (opts.path || '/'));
  parts.push('Max-Age=' + Math.floor((opts.maxAgeMs || DEFAULT_MAX_AGE_MS) / 1000));
  parts.push('SameSite=' + (opts.sameSite || 'Lax'));
  if (opts.httpOnly !== false) parts.push('HttpOnly');
  if (opts.secure !== false) parts.push('Secure');
  return parts.join('; ');
}

function parseCookieHeader(header) {
  const out = {};
  for (const chunk of String(header || '').split(';')) {
    const i = chunk.indexOf('=');
    if (i === -1) continue;
    out[chunk.slice(0, i).trim()] = decodeURIComponent(chunk.slice(i + 1).trim());
  }
  return out;
}

module.exports = { buildSessionCookie, parseCookieHeader, DEFAULT_MAX_AGE_MS };
