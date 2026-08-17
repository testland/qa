const TTL_MS = 30 * 60 * 1000;

export function createToken(userId) {
  const issuedAt = Date.now();

  return {
    id: Math.random().toString(36).slice(2, 10),
    userId,
    issuedAt,
    expiresAt: issuedAt + TTL_MS,
  };
}

export function isExpired(token, now = Date.now()) {
  return now >= token.expiresAt;
}
