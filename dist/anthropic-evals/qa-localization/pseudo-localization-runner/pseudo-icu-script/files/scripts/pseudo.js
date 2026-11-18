// Generates locales/xx-PS.json from locales/en.json for the QA build.
const fs = require('fs');

const MAP = { a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú', A: 'Á', E: 'É', I: 'Í', O: 'Ó', U: 'Ú', c: 'ç', n: 'ñ' };
const en = JSON.parse(fs.readFileSync('locales/en.json', 'utf8'));
const out = {};
for (const [key, msg] of Object.entries(en)) {
  out[key] = msg.replace(/[a-zA-Z]/g, (ch) => MAP[ch] || ch);
}
fs.writeFileSync('locales/xx-PS.json', JSON.stringify(out, null, 2));
