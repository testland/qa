'use strict';

const { members, people } = require('../db/seed');

function profileKey(memberNo) {
  return `profile:${memberNo}`;
}

function loadProfile(cache, session) {
  const key = profileKey(session.memberNo);
  const hit = cache.get(key);
  if (hit) return hit;

  const member = members.find(
    (m) => m.tenantId === session.tenantId && m.memberNo === session.memberNo,
  );
  const person = people.find((p) => p.personId === member.personId);
  const profile = { displayName: person.displayName, email: person.email, org: member.tenantId };
  cache.set(key, profile);
  return profile;
}

module.exports = { profileKey, loadProfile };
