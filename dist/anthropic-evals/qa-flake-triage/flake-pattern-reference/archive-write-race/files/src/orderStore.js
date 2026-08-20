'use strict';

const rows = [];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Write round-trip. Most writes are served by the local buffer; roughly one
// in seven goes the long way round to the primary.
async function archive(order) {
  await wait(Math.random() < 0.15 ? 45 : 2);
  rows.push({ ...order, archived: true });
}

// Read round-trip.
async function listArchived() {
  await wait(25);
  return rows.slice();
}

function reset() {
  rows.length = 0;
}

module.exports = { archive, listArchived, reset };
