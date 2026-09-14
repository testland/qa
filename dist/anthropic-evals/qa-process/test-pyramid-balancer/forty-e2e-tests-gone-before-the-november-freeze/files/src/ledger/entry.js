export function buildEntry({ amountMinor, currency, ref, postedAt }) {
  if (!Number.isInteger(amountMinor)) throw new TypeError('amountMinor must be an integer');
  if (!/^[A-Z]{3}$/.test(currency)) throw new RangeError('currency must be ISO 4217 alpha-3');
  return {
    amount_minor: amountMinor,
    currency,
    reference: ref,
    posted_at: postedAt,
    schema: 'ledger.entry.v3'
  };
}

export const MINOR_UNITS = { USD: 2, EUR: 2, JPY: 0, BHD: 3 };
