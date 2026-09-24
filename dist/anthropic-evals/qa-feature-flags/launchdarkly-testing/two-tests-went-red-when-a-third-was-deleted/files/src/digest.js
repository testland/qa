'use strict';

function isNight(hour) {
  return hour >= 22 || hour < 7;
}

async function shouldSendDigest(client, user, hour) {
  const enabled = await client.variation('digest-email', user, false);
  if (!enabled) return false;
  const quiet = await client.variation('quiet-hours', user, false);
  if (quiet && isNight(hour)) return false;
  return true;
}

async function digestChannel(client, user) {
  const push = await client.variation('digest-push-channel', user, false);
  return push ? 'push' : 'email';
}

module.exports = { isNight, shouldSendDigest, digestChannel };
