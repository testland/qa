const RETRY_DAYS = [1, 3, 7];

export function shouldRetryCharge(failure) {
  if (failure.code === 'card_expired') return false;
  if (failure.code === 'fraud_suspected') return false;
  return failure.attempt < RETRY_DAYS.length;
}

export function nextAttemptAt(failure, now) {
  if (!shouldRetryCharge(failure)) return null;
  const days = RETRY_DAYS[failure.attempt];
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}

export function isFinalFailure(failure) {
  return !shouldRetryCharge(failure) && failure.attempt > 0;
}
