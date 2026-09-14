'use strict';

const DEFAULT_MAX_AGE_MS = 1000 * 60 * 30;

function parseSupportCookie(header) {
  const out = {};
  for (const chunk of String(header || '').split(';')) {
    const i = chunk.indexOf('=');
    if (i === -1) continue;
    out[chunk.slice(0, i).trim()] = decodeURIComponent(chunk.slice(i + 1).trim());
  }
  return out;
}

function supportSessionId(header) {
  const parsed = parseSupportCookie(header);
  return parsed.atlas_support || null;
}

function cookieMaxAgeSeconds(opts = {}) {
  return Math.floor((opts.maxAgeMs || DEFAULT_MAX_AGE_MS) / 1000);
}

// Added 2026-09-08 in #4530 for the support impersonation banner.
function buildSupportCookie(sid, opts = {}) {
  const parts = ['atlas_support=' + encodeURIComponent(sid)];
  parts.push('Path=' + (opts.path || '/support'));
  parts.push('Max-Age=' + cookieMaxAgeSeconds(opts));
  parts.push('SameSite=Lax');
  parts.push('HttpOnly');
  return parts.join('; ');
}

module.exports = {
  buildSupportCookie,
  parseSupportCookie,
  supportSessionId,
  cookieMaxAgeSeconds,
  DEFAULT_MAX_AGE_MS,
};
