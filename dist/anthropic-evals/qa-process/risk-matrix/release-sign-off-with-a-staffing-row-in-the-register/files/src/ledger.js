export function applyPayout(account, amountCents) {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error('amountCents must be a positive integer');
  }
  if (amountCents > account.balanceCents) throw new Error('insufficient funds');
  return { ...account, balanceCents: account.balanceCents - amountCents };
}
