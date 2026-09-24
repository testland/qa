export function applyEntry(balanceCents, entry) {
  if (!Number.isInteger(entry.amountCents)) {
    throw new TypeError('amountCents must be an integer number of cents');
  }
  return entry.kind === 'credit'
    ? balanceCents + entry.amountCents
    : balanceCents - entry.amountCents;
}

export function balanceOf(entries) {
  return entries.reduce(applyEntry, 0);
}
