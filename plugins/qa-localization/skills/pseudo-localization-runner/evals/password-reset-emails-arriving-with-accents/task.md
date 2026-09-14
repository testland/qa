# Password reset emails went out with the test locale in them

## Problem Description

INC-4471, opened 2026-09-11. For about nineteen hours every password reset email
from the notifier went out with the accented test strings in the subject and
body - square brackets, doubled vowels, the lot. 3,102 customers. The write-up is
in `reports/inc-4471.md`.

The first thing everyone checked was the switch: `src/flags.js` reads
`PSEUDO_LOCALE` and the production task definition does not set it. We pulled the
running config off the host and it was not set there either. So the switch was
off, and the emails still went out accented.

Dana's proposal is on the incident ticket: take the accented characters out of
the generator and leave the square brackets, so the test strings stay obvious to
us in staging and read as normal English if they ever escape again. She points
out it is a fifteen-minute change with no coordination cost, against a fix to the
pipeline that touches the release path for every service.

I need to know how this got out and what stops it. `npm test` green at the end.

## Output Specification

1. Find how the accented strings reached production and fix it there.
2. Add a check that fails against the repository as it stands and passes against
   your fix, so the next person cannot ship this by accident.
3. Write `docs/inc-4471-followup.md`: the mechanism, why the existing suite was
   green through all of it, what you did with Dana's proposal and why, and what
   the fix means for the other services.
4. `npm test` must pass when you are done.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "notifier",
  "version": "4.1.3",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: locales/en.json ===============
{
  "reset.subject": "Reset your password",
  "reset.body": "Click the link below to choose a new password.",
  "reset.cta": "Choose a new password",
  "reset.expiry": "This link stops working in 30 minutes."
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

=============== FILE: src/flags.js ===============
// Opt-in only. Unset, empty and any other value all mean off.
const PSEUDO_LOCALE = process.env.PSEUDO_LOCALE === 'on';

module.exports = { PSEUDO_LOCALE };

=============== FILE: src/notifier.js ===============
const strings = require('../locales/en.json');
const { PSEUDO_LOCALE } = require('./flags');
const { pseudoLocalize } = require('./pseudo');

function line(key) {
  const raw = strings[key];
  return PSEUDO_LOCALE ? pseudoLocalize(raw) : raw;
}

function resetEmail(to) {
  return {
    to,
    subject: line('reset.subject'),
    body: [line('reset.body'), line('reset.cta'), line('reset.expiry')].join('\n'),
  };
}

module.exports = { resetEmail, line };

=============== FILE: scripts/build-locales.js ===============
const fs = require('node:fs');
const path = require('node:path');
const { pseudoLocalize } = require('../src/pseudo');

const LOCALES = path.join(__dirname, '..', 'locales');
const SOURCE = path.join(LOCALES, 'en.json');

function parseArgs(argv) {
  const args = new Map();
  for (const arg of argv) {
    const [key, value] = arg.split('=');
    args.set(key.replace(/^--/, ''), value);
  }
  return args;
}

function build(argv) {
  const args = parseArgs(argv);
  const code = args.get('locale') || 'en';
  const out = args.get('out') || path.join(LOCALES, code + '.json');
  const source = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));
  const built = {};
  for (const [key, value] of Object.entries(source)) built[key] = pseudoLocalize(value);
  fs.writeFileSync(out, JSON.stringify(built, null, 2) + '\n');
  return out;
}

if (require.main === module) console.log('built', build(process.argv.slice(2)));

module.exports = { build, parseArgs };

=============== FILE: ci/release.sh ===============
#!/bin/sh
set -e

npm ci
npm test

# locale bundles are generated into the image, not committed
node scripts/build-locales.js

docker build -t registry.internal/notifier:"$GIT_SHA" .
docker push registry.internal/notifier:"$GIT_SHA"

=============== FILE: test/notifier.test.js ===============
const test = require('node:test');
const assert = require('node:assert');
const { resetEmail, line } = require('../src/notifier');

test('the reset email carries a subject and a body', () => {
  const mail = resetEmail('sam@example.com');
  assert.strictEqual(mail.to, 'sam@example.com');
  assert.ok(mail.subject.length > 0);
  assert.ok(mail.body.split('\n').length === 3);
});

test('the reset subject reads as english', () => {
  assert.strictEqual(line('reset.subject'), 'Reset your password');
});

=============== FILE: test/build-locales.test.js ===============
const test = require('node:test');
const assert = require('node:assert');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');
const { build } = require('../scripts/build-locales');

test('the generator writes a bundle with every key transformed', () => {
  const out = path.join(os.tmpdir(), 'xa-' + Date.now() + '.json');
  build(['--locale=en-XA', '--out=' + out]);
  const built = JSON.parse(fs.readFileSync(out, 'utf8'));
  assert.strictEqual(Object.keys(built).length, 4);
  for (const value of Object.values(built)) assert.match(value, /^\[.*\]$/);
});

=============== FILE: reports/inc-4471.md ===============
# INC-4471 - accented strings in customer password reset emails

**Window:** 2026-09-10 17:40 UTC to 2026-09-11 12:35 UTC. **Reach:** 3,102
recipients. **Resolved by:** rolling notifier back to the 2026-09-09 image.

Timeline:

- 2026-09-10 17:31 - `notifier` released from `main` at `e77ac31`, no locale
  work in the diff. Release ran green, including `npm test`.
- 2026-09-10 17:40 - first affected email. Subject reads
  `[Rèešèeţ yòoùur pàaššwòord]`.
- 2026-09-10 22:04 - support escalates; on-call confirms `PSEUDO_LOCALE` is
  unset on every notifier task and restarts the service anyway. No change.
- 2026-09-11 09:15 - on-call confirms the same on the 2026-09-09 image, which is
  serving English correctly, and escalates to platform.
- 2026-09-11 12:35 - rollback to the 2026-09-09 image. Emails correct.

Notes from the review:

- `e77ac31` changed a retry timeout in the send queue and nothing else. The
  previous notifier release was 2026-09-02 and was clean. The only other thing
  that moved in between is `ci/release.sh`, which platform edited on 2026-09-08
  to start generating locale bundles into the image so staging could offer the
  accented locale without another build. That file is shared, so it does not
  appear in any service's diff.
- 47 of the affected recipients are on the SMS fallback path. Those messages
  arrived as `[R?es?e?...]` with question marks rather than accented letters,
  which is how we found out the SMS gateway is transcoding to a single-byte
  encoding. That is a separate ticket, CX-8890, and it is a real defect - it
  would garble a French or German message the same way.
- The web console was serving correct English throughout the window. Only the
  notifier was affected.
- `digest-worker` releases 2026-09-22 through the same release script and the
  same base image. `billing-mailer` and `invite-service` are on that script too.
- Nobody could reproduce it locally. Checking out `e77ac31` and running the
  service serves English.
