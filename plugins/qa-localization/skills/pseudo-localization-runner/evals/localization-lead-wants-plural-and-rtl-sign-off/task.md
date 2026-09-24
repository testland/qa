# Four verdicts before I can book the Spanish and Russian vendors

## Problem Description

I run localization for the console. The purchase order needs four lines signed
off and I have nothing to sign them with, because the accented-locale run QA did
on 2026-09-08 came back with thirty-nine findings and the platform team says all
thirty-nine are noise. Their triage is in `reports/qa-triage.md`.

Marco has a one-line patch on his branch - it is written out in
`patches/marco-branch.md` - that clears thirty-seven of them, leaves the suite
green, and lets QA re-walk the build the same afternoon. He is not wrong that
the current output is unusable; I have looked at it myself and I would not hand
that to a vendor.

The four lines I need, one each, yes or no, with the reason:

1. Every user-visible string in the cart is wrapped for translation.
2. Our containers hold up when translated text runs longer than English.
3. Our plural-bearing strings are safe to hand to a translator.
4. The cart is ready for Hebrew. Platform has already marked this one covered
   on the readiness sheet; I want your read on it, not theirs.

I have had a month of "it depends" on this and I cannot put "it depends" on a
purchase order, so please give me a verdict per line rather than an overall
grade.

`test/views.test.js` is the English suite half the team's work depends on;
leave it exactly as it is.

## Output Specification

1. Make whatever code changes your answer requires, so that the accented run
   produces output a human can triage. You may add files under `test/`.
2. Leave `test/views.test.js` unmodified.
3. Write `docs/l10n-verdicts.md`: the four verdicts with reasons, which of the
   findings were real and which were not, and what you changed.
4. `npm test` must pass when you are done.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "shop-console",
  "version": "2.9.0",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: locales/en.json ===============
{
  "greeting.hello": "Hello, {{name}}",
  "cart.summary": "{{count}} items - {{total}} due",
  "invite.sent": "Invite sent to {{email}}",
  "cart.checkout": "Proceed to checkout",
  "cart.empty": "Your cart is empty"
}

=============== FILE: src/pseudo.js ===============
const MULTIPLIER = 2;

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

function mirrorLocalize(source) {
  return [...source].reverse().join('');
}

module.exports = { pseudoLocalize, mirrorLocalize, MULTIPLIER };

=============== FILE: src/i18n.js ===============
const en = require('../locales/en.json');
const { pseudoLocalize, mirrorLocalize } = require('./pseudo');

let current = 'en';

function setLocale(code) {
  current = code === 'en-XA' || code === 'en-XB' ? code : 'en';
  return current;
}

function currentLocale() {
  return current;
}

function interpolate(text, vars) {
  return text.replace(/\{\{(\w+)\}\}/g, (token, name) =>
    vars && Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : token,
  );
}

function transform(raw) {
  if (current === 'en-XA') return pseudoLocalize(raw);
  if (current === 'en-XB') return mirrorLocalize(raw);
  return raw;
}

function t(key, vars) {
  const raw = Object.prototype.hasOwnProperty.call(en, key) ? en[key] : key;
  return interpolate(transform(raw), vars);
}

module.exports = { setLocale, currentLocale, t };

=============== FILE: src/views.js ===============
const { t } = require('./i18n');

const WIDTHS = {
  greeting: 26,
  summary: 22,
  invite: 31,
  checkout: 30,
  remove: 12,
};

function fit(text, max) {
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}

function renderCart(user, cart) {
  return [
    { id: 'greeting', text: fit(t('greeting.hello', { name: user.name }), WIDTHS.greeting) },
    { id: 'summary', text: fit(t('cart.summary', { count: cart.count, total: cart.total }), WIDTHS.summary) },
    { id: 'invite', text: fit(t('invite.sent', { email: user.email }), WIDTHS.invite) },
    { id: 'checkout', text: fit(t('cart.checkout'), WIDTHS.checkout) },
    { id: 'remove', text: fit('Remove', WIDTHS.remove) },
  ];
}

module.exports = { renderCart, WIDTHS };

=============== FILE: test/views.test.js ===============
const test = require('node:test');
const assert = require('node:assert');
const { setLocale } = require('../src/i18n');
const { renderCart } = require('../src/views');

const USER = { name: 'Ada', email: 'ada@example.com' };
const CART = { count: 3, total: '$41.00' };

test('the cart renders every row in english', () => {
  setLocale('en');
  assert.strictEqual(renderCart(USER, CART).length, 5);
});

test('english rows are not clipped', () => {
  setLocale('en');
  for (const row of renderCart(USER, CART)) {
    assert.ok(!row.text.endsWith('…'), row.id + ' clipped in english');
  }
});

test('english interpolates the values it is given', () => {
  setLocale('en');
  const rows = renderCart(USER, CART);
  assert.match(rows[0].text, /Ada/);
  assert.match(rows[1].text, /\$41\.00/);
});

=============== FILE: test/accented.test.js ===============
const test = require('node:test');
const assert = require('node:assert');
const { setLocale } = require('../src/i18n');
const { renderCart } = require('../src/views');

const USER = { name: 'Ada', email: 'ada@example.com' };
const CART = { count: 3, total: '$41.00' };

test('the accented locale renders every row', () => {
  setLocale('en-XA');
  const rows = renderCart(USER, CART);
  setLocale('en');
  assert.strictEqual(rows.length, 5);
  for (const row of rows) {
    assert.ok(row.text.trim().length > 0, row.id + ' empty');
  }
});

=============== FILE: reports/qa-triage.md ===============
# Accented-locale walkthrough, 2026-09-08 - 39 findings

Build `af31c02`, staging, accented locale selected in the environment switcher.
Rows 1-37 are the same shape and are collapsed here; the full list is in the
ticket.

| #     | Surface              | What QA wrote                                            |
|-------|----------------------|----------------------------------------------------------|
| 1-14  | cart, greeting row   | "the row shows a bracketed token where my name should be" |
| 15-29 | cart, summary row    | "quantity and amount both show tokens, not numbers"       |
| 30-37 | invite dialog        | "the address never appears, just the token"               |
| 38    | cart, summary row    | "the row is cut off before the amount"                    |
| 39    | invite dialog        | "the line is cut off"                                     |

Platform team's note on the ticket:

> 37 of these are the same thing and it is not a product bug, it is something
> the locale is doing to itself. Nobody is going to page an on-call for a locale
> QA turned on themselves. Rows 38 and 39 are the same 37 in a different costume
> - of course the row is cut off, it is twice as long as it should be.

QA's note on the ticket:

> We were told to walk the build and write down what we saw. We wrote down what
> we saw. If the run is not supposed to produce this we would like to know what
> it is supposed to produce, because we have no way to tell one of these apart
> from a real defect.

Same pair, same afternoon, mirrored locale (`en-XB`):

> Walked the cart and the invite dialog end to end. Every row came back
> reversed, nothing overlapped, nothing missing. Nothing to report.

Platform marked the right-to-left row on the readiness sheet as covered on the
strength of that second walk.

=============== FILE: patches/marco-branch.md ===============
# marco/quiet-the-accented-run - one line in src/i18n.js

```
function t(key, vars) {
  const raw = Object.prototype.hasOwnProperty.call(en, key) ? en[key] : key;
- return interpolate(transform(raw), vars);
+ return transform(interpolate(raw, vars));
}
```

> Put the values in first and transform the finished line. The locale was never
> meant to chew on our interpolation tokens, and once the values are already in
> the string there is nothing left for it to chew on. That is all thirty-seven
> of the token findings.
>
> I am not claiming 38 and 39 with them - those two rows are genuinely tight and
> I will raise them separately. One line, green suite, QA can re-walk this
> afternoon. - M
