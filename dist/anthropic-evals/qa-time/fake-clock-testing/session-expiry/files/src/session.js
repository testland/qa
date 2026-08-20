const SESSION_TTL_MS = 30 * 60 * 1000;
const SWEEP_INTERVAL_MS = 60 * 1000;

function createSession(id) {
  return { id, lastSeenAt: Date.now() };
}

function touch(session) {
  session.lastSeenAt = Date.now();
  return session;
}

function isExpired(session) {
  return Date.now() - session.lastSeenAt >= SESSION_TTL_MS;
}

function startSweeper(store) {
  return setInterval(() => {
    for (const [id, session] of store.entries()) {
      if (isExpired(session)) {
        store.delete(id);
      }
    }
  }, SWEEP_INTERVAL_MS);
}

module.exports = {
  createSession,
  touch,
  isExpired,
  startSweeper,
  SESSION_TTL_MS,
  SWEEP_INTERVAL_MS,
};
