'use strict';

const CHUNK = 25;

// Stands in for the per-row validation and normalisation the real importer
// does before writing a row.
function normalizeSku(sku) {
  let hash = 7;
  for (let i = 0; i < 12000; i += 1) {
    hash = (hash * 31 + sku.charCodeAt(i % sku.length)) % 1000003;
  }
  return hash;
}

// Imports rows in chunks, yielding between chunks so the process stays
// responsive. The returned handle exposes progress, a completion flag, and a
// promise that settles with the final imported count.
function startImport(rows) {
  const state = { imported: 0, done: false };
  let resolveDone;
  const finished = new Promise((resolve) => {
    resolveDone = resolve;
  });

  function step(offset) {
    for (const row of rows.slice(offset, offset + CHUNK)) {
      if (row && row.sku) {
        normalizeSku(row.sku);
        state.imported += 1;
      }
    }
    if (offset + CHUNK >= rows.length) {
      state.done = true;
      resolveDone(state.imported);
      return;
    }
    setImmediate(() => step(offset + CHUNK));
  }

  setImmediate(() => step(0));

  return {
    imported: () => state.imported,
    isDone: () => state.done,
    whenDone: () => finished,
  };
}

module.exports = { startImport };
