'use strict';

const HEADERS = ['ref', 'origin', 'destination', 'weight_kg'];

function toCsvRow(values) {
  return values
    .map((v) => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    })
    .join(',');
}

function buildShipmentCsv(shipments) {
  const lines = [toCsvRow(HEADERS)];
  for (const s of shipments) {
    lines.push(toCsvRow([s.ref, s.origin, s.destination, s.weightKg]));
  }
  return lines.join('\n');
}

module.exports = { buildShipmentCsv, toCsvRow, HEADERS };
