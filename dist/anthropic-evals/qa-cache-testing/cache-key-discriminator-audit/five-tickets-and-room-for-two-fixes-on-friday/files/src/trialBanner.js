'use strict';

const db = require('./db');

const DAY_MS = 86400000;

function trialBannerKey(tenantId) {
  return `trial-banner:${tenantId}`;
}

// The trial end date does not move, so this is held for a week.
function loadTrialBanner(cache, session, now) {
  const key = trialBannerKey(session.tenantId);
  const hit = cache.get(key);
  if (hit) return hit;

  const endsAt = Date.parse(db.org(session.tenantId).trialEndsAt);
  const daysLeft = Math.max(0, Math.ceil((endsAt - now) / DAY_MS));
  const banner = { daysLeft, text: `Your trial ends in ${daysLeft} days` };
  cache.set(key, banner, 604800);
  return banner;
}

module.exports = { trialBannerKey, loadTrialBanner };
