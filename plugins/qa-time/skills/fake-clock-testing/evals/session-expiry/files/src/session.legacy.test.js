const { createSession, isExpired, SESSION_TTL_MS } = require('./session');

describe('isExpired', () => {
  it('expires a session from two hours ago', () => {
    const session = createSession('s1');
    session.lastSeenAt = Date.now() - 2 * 60 * 60 * 1000;
    expect(isExpired(session)).toBe(true);
  });

  it('keeps a session created just now', () => {
    expect(isExpired(createSession('s2'))).toBe(false);
  });
});

describe('SESSION_TTL_MS', () => {
  it('is thirty minutes', () => {
    expect(SESSION_TTL_MS).toBe(1800000);
  });
});
