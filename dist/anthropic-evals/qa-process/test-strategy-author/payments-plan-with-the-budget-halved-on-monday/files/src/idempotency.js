export function createLedger() {
  return new Map();
}

export function capture(ledger, key, amountCents) {
  if (!key) throw new Error('idempotency key required');
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error('amountCents must be a positive integer');
  }
  ledger.set(key, amountCents);
  return { captured: true, amountCents };
}

export function totalCaptured(ledger) {
  let total = 0;
  for (const amount of ledger.values()) total += amount;
  return total;
}
