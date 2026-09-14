'use strict';

// The period a run started at slotMs processes: the UTC calendar day before it.
function periodFor(slotMs) {
  return new Date(slotMs - 86400000).toISOString().slice(0, 10);
}

module.exports = { periodFor };
