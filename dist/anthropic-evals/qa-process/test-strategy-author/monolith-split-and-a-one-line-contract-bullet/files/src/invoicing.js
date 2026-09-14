import { begin, commit, rollback, put, get } from './store.js';

const POSTING_LIMIT_CENTS = 1_000_000;

export function postInvoice(store, invoice) {
  begin(store);
  try {
    if (get(store, 'invoices', invoice.id)) throw new Error('invoice already posted');
    put(store, 'invoices', invoice.id, { id: invoice.id, accountId: invoice.accountId, status: 'posted' });
    let totalCents = 0;
    for (const line of invoice.lines) {
      if (!Number.isInteger(line.amountCents) || line.amountCents <= 0) {
        throw new Error('line amountCents must be a positive integer');
      }
      totalCents += line.amountCents;
      put(store, 'invoiceLines', `${invoice.id}:${line.sku}`, { invoiceId: invoice.id, ...line });
    }
    if (totalCents > POSTING_LIMIT_CENTS) throw new Error('above the posting limit');
    commit(store);
    return { posted: true, totalCents };
  } catch (err) {
    rollback(store);
    throw err;
  }
}
