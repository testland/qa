'use strict';

// A transfer leaves the customer whole when its customer-visible postings sum to zero.
function transfer(exportDoc, ref) {
  return exportDoc.transfers.find((t) => t.ref === ref);
}

function customerDelta(t) {
  return t.postings
    .filter((p) => p.kind === 'customer')
    .reduce((sum, p) => sum + p.minorUnits, 0);
}

function unreleasedHolds(t) {
  return t.postings.filter((p) => p.kind === 'clearing' && p.released === false);
}

function reconcile(t) {
  const delta = customerDelta(t);
  return { ref: t.ref, route: t.route, delta, balanced: delta === 0, holds: unreleasedHolds(t) };
}

module.exports = { transfer, customerDelta, unreleasedHolds, reconcile };
