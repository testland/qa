'use strict';

function normaliseJsonRow(row) {
  return {
    id: String(row.id),
    postalCode: String(row.postal_code),
    city: row.city,
  };
}

function importJson(rows) {
  return rows.map(normaliseJsonRow);
}

function parseCsv(text) {
  const [head, ...lines] = text.trim().split('\n');
  const cols = head.split(',');
  return lines.map((line) => {
    const cells = line.split(',');
    const row = {};
    cols.forEach((c, i) => {
      row[c] = cells[i];
    });
    return row;
  });
}

function normaliseCsvRow(row) {
  return {
    id: String(row.id),
    postalCode: Number(row.postal_code),
    city: row.city,
  };
}

function importCsv(text) {
  return parseCsv(text).map(normaliseCsvRow);
}

module.exports = { importJson, importCsv };
