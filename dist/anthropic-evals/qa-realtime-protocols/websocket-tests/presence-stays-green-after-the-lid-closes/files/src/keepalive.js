'use strict';

const PING_INTERVAL_MS = 30_000;
const IDLE_LIMIT_MS = 90_000;

function diagnostics(session) {
  return JSON.stringify({
    kind: 'hb',
    session: session.id,
    user: session.userId,
    build: session.build,
    region: session.region,
    rooms: session.rooms,
    since: session.connectedAt,
  });
}

function startKeepalive(socket, session, options = {}) {
  const {
    interval = PING_INTERVAL_MS,
    schedule = setInterval,
    clear = clearInterval,
    now = Date.now,
  } = options;

  let lastSeen = now();

  socket.on('message', () => {
    lastSeen = now();
  });

  const timer = schedule(() => {
    socket.ping(diagnostics(session));
    lastSeen = now();
  }, interval);

  return {
    stop() {
      clear(timer);
    },
    lastSeenAt() {
      return lastSeen;
    },
    idleFor(at) {
      return at - lastSeen;
    },
  };
}

module.exports = { startKeepalive, diagnostics, PING_INTERVAL_MS, IDLE_LIMIT_MS };
