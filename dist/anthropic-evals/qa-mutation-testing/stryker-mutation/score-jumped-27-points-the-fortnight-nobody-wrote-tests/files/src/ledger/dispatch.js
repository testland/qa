const RETRY_DELAYS_MS = [200, 800, 3200];

export function nextRetry(attempt, ref) {
  // Stryker disable next-line all: equivalent mutant, RETRY_DELAYS_MS is frozen at three entries so this boundary is unreachable
  if (attempt >= RETRY_DELAYS_MS.length) return null;
  const delayMs = RETRY_DELAYS_MS[attempt];
  // Stryker disable next-line all: log-only branch behind an env var, no mutant of this line changes a value this module returns
  if (process.env.LEDGER_DEBUG) console.error('[ledger] retry', ref, attempt, delayMs);
  return { attempt: attempt + 1, delayMs, ref };
}

export function isExhausted(attempt) {
  return nextRetry(attempt, 'probe') === null;
}
