'use strict';

function buildSessionCookie({ sid, config, req }) {
  const parts = [`sid=${sid}`];
  parts.push(`Path=${config.path}`);
  parts.push('HttpOnly');
  parts.push(`SameSite=${config.sameSite}`);
  if (req.protocol === 'https') parts.push('Secure');
  if (config.cookieDomain) parts.push(`Domain=${config.cookieDomain}`);
  if (config.maxAgeSeconds) parts.push(`Max-Age=${config.maxAgeSeconds}`);
  return parts.join('; ');
}

module.exports = { buildSessionCookie };
