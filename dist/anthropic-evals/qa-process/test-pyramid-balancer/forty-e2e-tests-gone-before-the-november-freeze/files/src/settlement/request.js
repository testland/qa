import { MINOR_UNITS } from '../ledger/entry.js';

export function toSettlement(entry) {
  if (entry.schema !== 'ledger.entry.v3') {
    throw new RangeError('unsupported ledger schema ' + entry.schema);
  }
  const exponent = MINOR_UNITS[entry.currency];
  if (exponent === undefined) throw new RangeError('unknown currency ' + entry.currency);
  const amount = (entry.amount_minor / 10 ** exponent).toFixed(exponent);
  return {
    amount,
    currency: entry.currency,
    idempotency_key: entry.reference + ':' + entry.posted_at,
    settle_after: entry.posted_at
  };
}
