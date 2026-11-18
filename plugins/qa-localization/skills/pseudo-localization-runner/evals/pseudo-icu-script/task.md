# Make our pseudo-locale script safe and useful

## Problem Description

Fix `scripts/pseudo.js` so the pseudo-locale is safe to use and catches what it should (`notes.md`).

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: scripts/pseudo.js ===============
// Generates locales/xx-PS.json from locales/en.json for the QA build.
const fs = require('fs');

const MAP = { a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú', A: 'Á', E: 'É', I: 'Í', O: 'Ó', U: 'Ú', c: 'ç', n: 'ñ' };
const en = JSON.parse(fs.readFileSync('locales/en.json', 'utf8'));
const out = {};
for (const [key, msg] of Object.entries(en)) {
  out[key] = msg.replace(/[a-zA-Z]/g, (ch) => MAP[ch] || ch);
}
fs.writeFileSync('locales/xx-PS.json', JSON.stringify(out, null, 2));

=============== FILE: locales/en.json ===============
{
  "cart.items": "{count, plural, one {# item} other {# items}} in your cart",
  "greeting": "Hello, {firstName}!",
  "terms": "I agree to the <link>terms of service</link>",
  "order.status": "{status, select, shipped {On its way} other {Processing}}",
  "checkout.pay": "Pay now"
}

=============== FILE: notes.md ===============
- The QA build crashes on the cart page with an ICU formatting error.
- The terms link disappeared in the pseudo-locale.
- The pseudo-locale did not reveal a clipped "Pay now" button that German testers found later.
- The app formats messages with an ICU MessageFormat runtime (intl-messageformat); it does not use react-intl.
