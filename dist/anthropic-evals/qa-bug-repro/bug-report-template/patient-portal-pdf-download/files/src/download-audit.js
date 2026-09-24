'use strict';
const { readFileSync } = require('node:fs');

function parse(text) {
  const [header, ...lines] = text.trim().split(/\r?\n/);
  const cols = header.split(',');
  return lines
    .filter((line) => line.trim())
    .map((line) => {
      const cells = line.split(',');
      const row = {};
      cols.forEach((c, i) => {
        row[c] = cells[i];
      });
      row.http = Number(row.http);
      row.bytes = Number(row.bytes);
      return row;
    });
}

function load(path) {
  return parse(readFileSync(path, 'utf8'));
}

function countByOutcome(rows) {
  const out = {};
  for (const r of rows) out[r.outcome] = (out[r.outcome] ?? 0) + 1;
  return out;
}

function forAccount(rows, account) {
  return rows.filter((r) => r.account === account);
}

module.exports = { parse, load, countByOutcome, forAccount };
