'use strict';

const { members, people } = require('../db/seed');

// HR pushes a name or email change here. Every cached copy of that person
// has to go, wherever they are a member.
function onPersonUpdated(cache, personId, patch) {
  const person = people.find((p) => p.personId === personId);
  Object.assign(person, patch);
  for (const m of members.filter((x) => x.personId === personId)) {
    cache.del(`profile:${m.memberNo}`);
  }
  return person;
}

module.exports = { onPersonUpdated };
