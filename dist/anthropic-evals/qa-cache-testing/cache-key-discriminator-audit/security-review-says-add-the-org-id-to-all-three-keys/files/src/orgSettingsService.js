'use strict';

const { orgs } = require('../db/seed');

function orgSettingsKey(tenantId) {
  return `org:${tenantId}`;
}

function loadOrgSettings(cache, session) {
  const key = orgSettingsKey(session.tenantId);
  const hit = cache.get(key);
  if (hit) return hit;

  const org = orgs.find((o) => o.tenantId === session.tenantId);
  const settings = { orgName: org.orgName, region: org.region, seatLimit: org.seatLimit };
  cache.set(key, settings);
  return settings;
}

module.exports = { orgSettingsKey, loadOrgSettings };
