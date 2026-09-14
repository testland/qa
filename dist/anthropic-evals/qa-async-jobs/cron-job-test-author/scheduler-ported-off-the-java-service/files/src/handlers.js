'use strict';

// The period a run covers: the UTC calendar day before the instant it is given.
function periodFor(atMs) {
  return new Date(atMs - 86400000).toISOString().slice(0, 10);
}

function handlersFor(io) {
  return {
    'vat-file-upload': (atMs) => io.partner.putFile(periodFor(atMs), `vat-${periodFor(atMs)}.xml`),
    'payout-post': (atMs) =>
      io.ledger.append({ kind: 'settlement', period: periodFor(atMs), cents: io.settlementCents(periodFor(atMs)) }),
    'dunning-email': (atMs) => {
      for (const customer of io.overdueOn(periodFor(atMs))) io.mailer.send(customer, `overdue ${periodFor(atMs)}`);
    },
    'metrics-rollup': (atMs) => io.warehouse.writePartition(periodFor(atMs), io.factsFor(periodFor(atMs))),
    'session-prune': (atMs) => io.sessions.deleteExpired(atMs),
  };
}

module.exports = { handlersFor, periodFor };
