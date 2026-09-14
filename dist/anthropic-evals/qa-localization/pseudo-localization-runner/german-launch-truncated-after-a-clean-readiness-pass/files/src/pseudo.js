const MULTIPLIER = 3; // worst-case padding

const MAP = {
  a: 'à', e: 'è', i: 'ì', o: 'ò', u: 'ù',
  A: 'Á', E: 'É', I: 'Í', O: 'Ó', U: 'Ú',
  s: 'š', t: 'ţ',
};

function pseudoLocalize(source) {
  let out = '';
  for (const ch of source) {
    out += MAP[ch] || ch;
    if ('aeiouAEIOU'.includes(ch)) out += ch.repeat(MULTIPLIER - 1);
  }
  return '[' + out + ']';
}

module.exports = { pseudoLocalize, MULTIPLIER };
