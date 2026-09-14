# Six weeks of a green smoke job and four l10n bugs in the French release

## Problem Description

We shipped French on 2026-08-28 and got four bug reports back inside a day. All
four are the sort of thing `test/smoke.test.js` was added to catch. It went in
six weeks ago, has run 42 times, and has been green every single time including
the run on the release commit. The reports, and what QA recorded on the staging
walkthrough before we shipped, are in `reports/escaped-bugs.md`.

I have read the job myself and I cannot see what is wrong with it. It selects
the accented locale, it checks that the selection took, and then it walks the
toolbar and asserts nothing is truncated. That is the whole of what I would have
asked for.

Tom has been over it too and has two changes he wants, written up in
`notes/tom-suggestion.md`.

German is 2026-09-25. I need the job to mean something before then: add whatever
it is missing, fix what that turns up, and make `npm test` green.
`test/toolbar.test.js` is the English suite a lot of other work sits on top of -
leave it exactly as it is.

## Output Specification

1. Repair `test/smoke.test.js` so it fails on each class of problem in the
   report. You may add files under `test/` and change application code.
2. Leave `test/toolbar.test.js` unmodified.
3. Write `docs/smoke-findings.md`: what the job was actually checking for six
   weeks, what each assertion you added catches, what you changed in the
   application, and what you did with Tom's two changes.
4. `npm test` must pass when you are done.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "editor-console",
  "version": "5.1.0",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: locales/en.json ===============
{
  "toolbar.saveDraft": "Save draft",
  "toolbar.publish": "Publish",
  "toolbar.discard": "Discard changes",
  "banner.trialEnds": "Trial ends in 4 days"
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

module.exports = { pseudoLocalize, MULTIPLIER };

=============== FILE: src/i18n.js ===============
const en = require('../locales/en.json');
const { pseudoLocalize } = require('./pseudo');

let current = 'en';

function setLocale(code) {
  current = code === 'en-XA' ? 'en-XA' : 'en';
  return current === code;
}

function currentLocale() {
  return current;
}

function t(key) {
  const raw = Object.prototype.hasOwnProperty.call(en, key) ? en[key] : key;
  return current === 'en-XA' ? pseudoLocalize(raw) : raw;
}

module.exports = { setLocale, currentLocale, t };

=============== FILE: src/toolbar.js ===============
const { t } = require('./i18n');

const WIDTHS = {
  save: 8,
  saveDraft: 14,
  publish: 11,
  discard: 20,
  trial: 26,
};

// resolved once; the toolbar does not re-translate on every render
const LABELS = {
  save: 'Save',
  saveDraft: t('toolbar.saveDraft'),
  publish: t('toolbar.publish'),
  discard: t('toolbar.discard'),
  trial: t('banner.trialEnds'),
};

function fit(text, max) {
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}

function renderToolbar() {
  return Object.keys(LABELS).map((id) => ({ id, text: fit(LABELS[id], WIDTHS[id]) }));
}

module.exports = { renderToolbar, WIDTHS };

=============== FILE: src/bootstrap.js ===============
const { setLocale, currentLocale } = require('./i18n');
const { renderToolbar } = require('./toolbar');

function start(env) {
  setLocale((env && env.LOCALE) || 'en');
  return { locale: currentLocale(), toolbar: renderToolbar() };
}

module.exports = { start };

=============== FILE: test/toolbar.test.js ===============
const test = require('node:test');
const assert = require('node:assert');
const { setLocale } = require('../src/i18n');
const { renderToolbar } = require('../src/toolbar');

test('the toolbar renders every control', () => {
  setLocale('en');
  assert.strictEqual(renderToolbar().length, 5);
});

test('english labels are not truncated', () => {
  setLocale('en');
  for (const cell of renderToolbar()) {
    assert.ok(!cell.text.endsWith('…'), cell.id + ' truncated');
  }
});

=============== FILE: test/smoke.test.js ===============
const test = require('node:test');
const assert = require('node:assert');
const { setLocale, currentLocale } = require('../src/i18n');
const { renderToolbar } = require('../src/toolbar');

// l10n smoke, added 2026-07-16.

test('the accented locale is selected before the walk', () => {
  assert.strictEqual(setLocale('en-XA'), true);
  assert.strictEqual(currentLocale(), 'en-XA');
  setLocale('en');
});

test('the toolbar does not truncate under the accented locale', () => {
  setLocale('en-XA');
  for (const cell of renderToolbar()) {
    assert.ok(!cell.text.endsWith('…'), cell.id + ' truncated under the accented locale');
  }
  setLocale('en');
});

=============== FILE: reports/escaped-bugs.md ===============
# French release 2026-08-28 - escaped l10n defects

| # | Report                                                                | Surface |
|---|-----------------------------------------------------------------------|---------|
| 1 | "Enregistrer le brouillon" arrives as "Enregistrer l..."               | toolbar |
| 2 | "Annuler les modifications" arrives as "Annuler les mod..."            | toolbar |
| 3 | Trial banner is cut off mid-word for French accounts                   | banner  |
| 4 | A customer screenshot of the French toolbar has an English word in it  | toolbar |

Job history: `test/smoke.test.js` merged 2026-07-16, 42 runs, 42 green, 0
failures. Green on the release commit `9c1f4ab`.

QA walkthrough, staging, 2026-08-21, accented locale chosen in the environment
switcher:

> Walked the editor toolbar and the trial banner end to end. Nothing clipped,
> nothing overlapping, no boxes or garbled characters anywhere on the page. If I
> am honest it did not look very different from the English build, but the
> switcher said the accented locale was on and the job agrees with it, so I have
> signed this off.

The French strings came back from the vendor on 2026-08-19 and were spot-checked
by a native speaker; the translations are fine, it is the console that is not.

Support ticket volume for the four reports: 61 in the first 24 hours, all from
the French cohort, which is 3% of accounts.

=============== FILE: notes/tom-suggestion.md ===============
# Two changes to the smoke job

**1. Stop walking the toolbar in it.** The job owns the strings, not the view.
Assert that `t()` comes back transformed for every key in `locales/en.json` and
drop the render walk entirely. It is faster, it cannot be broken by someone
moving a control, and it is testing the thing the locale is actually
responsible for.

**2. Add a guard at the top of the job** that fails if any key in
`locales/en.json` is missing or empty, so we stop finding that out from a
render. Four lines and it pays for itself the first time somebody lands a key
with an empty value. - T
