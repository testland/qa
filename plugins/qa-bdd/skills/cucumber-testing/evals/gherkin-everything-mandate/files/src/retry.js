function backoff(attempt, { base = 100, cap = 2000, jitter = 0 } = {}) {
  const raw = Math.min(cap, base * 2 ** (attempt - 1));
  return Math.round(raw * (1 - jitter));
}

module.exports = { backoff };
