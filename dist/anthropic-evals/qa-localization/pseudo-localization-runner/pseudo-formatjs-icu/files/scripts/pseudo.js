// Builds lang/en-XA.json for QA from the extracted English messages.
const fs = require('fs');
const map = { a: 'à', e: 'é', i: 'î', o: 'ô', u: 'û', c: 'ç', n: 'ñ', s: 'š', t: 'ţ', y: 'ý' };
const en = JSON.parse(fs.readFileSync('lang/en.json', 'utf8'));
const out = {};
for (const [id, msg] of Object.entries(en)) {
  out[id] = { defaultMessage: msg.defaultMessage.replace(/[aeioucnsty]/g, (ch) => map[ch]) + ' ~~~' };
}
fs.writeFileSync('lang/en-XA.json', JSON.stringify(out, null, 2));
