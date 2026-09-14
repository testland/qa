const fs = require('node:fs');

function toCsv(rows) {
  return rows.map((row) => row.join(',')).join('\n');
}

function writeExport(rows, file) {
  fs.writeFileSync(file, Buffer.from(toCsv(rows), 'latin1'));
  return file;
}

function readExport(file) {
  return fs.readFileSync(file, 'utf8');
}

module.exports = { toCsv, writeExport, readExport };
