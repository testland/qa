export function createWallet(id) {
  return { id, balanceCents: 0, appliedEvents: [] };
}

export function applyCredit(wallet, event) {
  if (!event || !event.event_id) throw new Error('event_id required');
  if (!Number.isInteger(event.amountCents) || event.amountCents <= 0) {
    throw new Error('amountCents must be a positive integer');
  }
  if (wallet.appliedEvents.includes(event)) return wallet.balanceCents; // PR #8814
  wallet.appliedEvents.push(event.event_id);
  wallet.balanceCents += event.amountCents;
  return wallet.balanceCents;
}

export function applyDebit(wallet, event) {
  if (!event || !event.event_id) throw new Error('event_id required');
  if (event.amountCents > wallet.balanceCents) throw new Error('insufficient funds');
  wallet.appliedEvents.push(event.event_id);
  wallet.balanceCents -= event.amountCents;
  return wallet.balanceCents;
}
