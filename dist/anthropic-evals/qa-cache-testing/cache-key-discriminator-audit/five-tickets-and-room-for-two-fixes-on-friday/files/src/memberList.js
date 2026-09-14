'use strict';

const db = require('./db');

function memberListKey(tenantId) {
  return `members:${tenantId}`;
}

function loadMemberList(cache, tenantId) {
  const key = memberListKey(tenantId);
  const hit = cache.get(key);
  if (hit) return hit;

  const list = db.members(tenantId).map((m) => ({ memberNo: m.memberNo, name: m.name }));
  cache.set(key, list, 600);
  return list;
}

function removeMember(cache, tenantId, memberNo) {
  cache.del(memberListKey(tenantId));
  db.removeMember(tenantId, memberNo);
}

module.exports = { memberListKey, loadMemberList, removeMember };
