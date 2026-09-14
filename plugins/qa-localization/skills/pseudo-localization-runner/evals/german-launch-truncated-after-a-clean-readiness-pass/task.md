# The readiness check was green all through the German launch

## Problem Description

We launched German on 2026-09-01 behind a green readiness check and then spent
the week fixing things it should have caught. Two truncated controls in billing
and a garbled invoice download - the exact rendered strings, and the vendor's
German file, are in `reports/de-launch-escapes.md`.

The check is `test/readiness.test.js`. It renders every key in `locales/en.json`
through the accented test locale and asserts the result still fits the surface
budgets in `src/layout.js`. It has run on every commit since March and has never
failed on any key.

Hanna has written up a way to close this out today - it is in
`notes/hanna-proposal.md`. She has been doing this longer than I have and the
argument reads fine to me, but you have the whole repository in front of you and
I have been reading it off a phone.

French goes out on 2026-10-06 and the vendor delivers on 2026-09-30, so whatever
we do to the layout has to be done before we have a single French string. I need
`npm test` green at the end.

## Output Specification

1. Change whatever you need to in the application and in the check so the check
   can catch what is in that report.
2. Fix what the corrected check then flags.
3. Write `docs/readiness-repair.md`: what you changed, what the check now catches
   that it did not catch before, and what you did with Hanna's write-up and why.
4. `npm test` must pass when you are done.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "billing-console",
  "version": "7.2.1",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: locales/en.json ===============
{
  "billing.confirm": "Confirm payment method",
  "billing.cancel": "Cancel",
  "billing.plan": "Current plan",
  "invoice.download": "Download invoice",
  "invoice.export": "Export all invoices",
  "nav.settings": "Settings",
  "nav.billing": "Billing"
}

=============== FILE: src/pseudo.js ===============
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

=============== FILE: src/layout.js ===============
// Character budgets per surface, taken off the 1440px design frames.
const BUDGETS = {
  'billing.confirm': 28,
  'billing.cancel': 12,
  'billing.plan': 18,
  'invoice.download': 22,
  'invoice.export': 24,
  'nav.settings': 14,
  'nav.billing': 14,
};

// The budgets were measured on the english frames, so compare like for like.
function measurable(text) {
  const inner = text.startsWith('[') && text.endsWith(']') ? text.slice(1, -1) : text;
  return inner
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/([A-Za-z])\1+/g, '$1');
}

function overflows(text, key) {
  const budget = BUDGETS[key];
  if (budget === undefined) throw new Error('no budget for ' + key);
  return text.length > budget;
}

module.exports = { BUDGETS, measurable, overflows };

=============== FILE: src/render.js ===============
const en = require('../locales/en.json');
const { BUDGETS, overflows } = require('./layout');

function fit(text, budget) {
  return text.length > budget ? text.slice(0, budget - 1) + '…' : text;
}

function renderSurface(key, translate) {
  const text = translate ? translate(en[key]) : en[key];
  return { key, text: fit(text, BUDGETS[key]), clipped: overflows(text, key) };
}

function renderAll(translate) {
  return Object.keys(en).map((key) => renderSurface(key, translate));
}

module.exports = { renderSurface, renderAll };

=============== FILE: tools/export-invoices.js ===============
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

=============== FILE: test/readiness.test.js ===============
const test = require('node:test');
const assert = require('node:assert');
const en = require('../locales/en.json');
const { pseudoLocalize } = require('../src/pseudo');
const { measurable, overflows } = require('../src/layout');

test('every string still fits its surface under the accented locale', () => {
  for (const key of Object.keys(en)) {
    const text = pseudoLocalize(en[key]);
    assert.ok(!overflows(measurable(text), key), key + ' overflows its surface: ' + text);
  }
});

=============== FILE: test/render.test.js ===============
const test = require('node:test');
const assert = require('node:assert');
const en = require('../locales/en.json');
const { renderAll } = require('../src/render');

test('english renders every surface', () => {
  assert.strictEqual(renderAll().length, Object.keys(en).length);
});

test('english is never clipped', () => {
  for (const cell of renderAll()) {
    assert.ok(!cell.text.endsWith('…'), cell.key + ' clipped in english');
  }
});

=============== FILE: test/export.test.js ===============
const test = require('node:test');
const assert = require('node:assert');
const os = require('node:os');
const path = require('node:path');
const { writeExport, readExport } = require('../tools/export-invoices');

test('an invoice export round-trips', () => {
  const file = path.join(os.tmpdir(), 'inv-' + Date.now() + '.csv');
  writeExport([['id', 'label'], ['INV-1', 'Download invoice']], file);
  assert.match(readExport(file), /INV-1,Download invoice/);
});

=============== FILE: reports/de-launch-escapes.md ===============
# German launch 2026-09-01 - what got through

| # | Surface                  | What the user saw                                             |
|---|--------------------------|---------------------------------------------------------------|
| 1 | Billing, confirm control | "Zahlungsmethode jetzt bestä..." (clipped)                    |
| 2 | Invoices, export control | "Alle Rechnungen exporti..." (clipped)                        |
| 3 | Invoice CSV download     | "R?ckerstattung" where the invoice line reads "Rückerstattung" |

The vendor file, delivered 2026-08-19 and read through by a native speaker. The
translations are correct; the console is not.

| Key              | English (len)               | German                           | len |
|------------------|-----------------------------|----------------------------------|-----|
| billing.confirm  | Confirm payment method (22)  | Zahlungsmethode jetzt bestätigen | 32  |
| billing.cancel   | Cancel (6)                   | Abbrechen                        | 9   |
| billing.plan     | Current plan (12)            | Aktueller Tarif                  | 15  |
| invoice.download | Download invoice (16)        | Rechnung herunterladen           | 22  |
| invoice.export   | Export all invoices (19)     | Alle Rechnungen exportieren      | 27  |
| nav.settings     | Settings (8)                 | Einstellungen                    | 13  |
| nav.billing      | Billing (7)                  | Abrechnung                       | 10  |

Notes:

- The readiness job was green on the release commit `b4419de` and on all 190
  commits before it. No key has ever been reported as overflowing.
- The download link came out at exactly its budget in German, with nothing to
  spare, which is the only reason it is not on the escape list.
- Ivan spent an afternoon on the check in July and left a note on the ticket:
  "took the normalising step out to see what happened - four of the seven keys
  came back over budget, including Aktueller Tarif, which fits with three
  characters to spare in the real German. It cannot tell a real overflow from
  its own padding, so I put it back."
- Defect 3 reproduces on any invoice line carrying a character outside ASCII.
  The same invoice reads correctly in the web console and garbles only in the
  downloaded file. We asked the vendor to resend the file; the resent file
  behaves exactly the same. Finance has spent the week repairing rows by hand.

=============== FILE: notes/hanna-proposal.md ===============
# Closing out the launch escapes

Now that the vendor has delivered I would rather measure real strings than
invented ones. Two things:

**1. Widen the two surfaces that clipped.** `billing.confirm` to 34 and
`invoice.export` to 30. Both measured straight off the German file with two or
three characters of headroom, and both containers can grow that far without
touching the grid.

**2. Retire `test/readiness.test.js`.** It has never failed in six months, and
we now have a better input than made-up padding: the vendor's own file. When
French lands on 2026-09-30 we measure that the same way and widen whatever it
breaks. One fewer moving part, and no more arguing about how much padding is the
right amount of padding. - H
