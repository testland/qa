'use strict';

function selectRecipients(users) {
  return users.filter((u) => u.digestOptIn && u.emailVerified && !u.archived);
}

function buildDigest(users, items) {
  return selectRecipients(users).map((u) => ({
    to: u.email,
    itemCount: items.length,
  }));
}

module.exports = { selectRecipients, buildDigest };
