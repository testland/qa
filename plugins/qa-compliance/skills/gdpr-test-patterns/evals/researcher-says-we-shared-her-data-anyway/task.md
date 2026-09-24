# A researcher says we shared her data and our opt-out tests are all green

## Problem Description

The attached report came in on Friday through our disclosure address. She is not
claiming a vulnerability. She is saying that during one visit we handed her
activity to vendors after she had already expressed a preference not to be
shared with.

Our own opt-out coverage is `src/optOut.cookie.test.js` and every case in it
passes. Our California readiness review is in three weeks and "the tests were
green" is not going to be an answer to anybody, least of all to her.

Work out from her report what actually happened on that visit, cover it, and
deal with everything her report puts in front of us. She has the trace and she
will read the reply closely, so I would rather we came back with the whole of it
than have her write again.

Our own banner flow has to keep working exactly as it does now. That part has
been signed off and a regression there is a worse problem than the one we
already have.

## Output Specification

1. Add `src/optOut.reported.test.js`.
2. Change `src/` as far as the new coverage requires. `src/optOut.cookie.test.js`
   must be left unchanged and passing.
3. Write `docs/disclosure-2026-09-05.md` — the reply to the researcher: what we
   found, what changed, and what we can now say about her visit specifically.
4. Run `npm test` before you finish; it must pass.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "hellogrid-web",
  "version": "8.0.2",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: reports/researcher-note.md ===============
# Unsolicited disclosure — privacy behaviour of hellogrid.example

Received 2026-09-05. Reproduced twice by the reporter, once by our on-call.

I browse with an extension that expresses my opt-out preference automatically on
every request I make, to every site. I have never interacted with your banner and
I have never accepted or dismissed anything of yours. You loaded vendor scripts
that share what I do with third parties anyway.

## The request as my browser sent it

    GET /pricing HTTP/1.1
    Host: hellogrid.example
    Accept: text/html,application/xhtml+xml
    Accept-Language: en-US,en;q=0.9
    Cache-Control: no-cache
    DNT: 1
    Sec-GPC: 1
    Upgrade-Insecure-Requests: 1
    User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)

## Scripts in the response for that page

    app.js
    consent-banner.js
    analytics-share.js
    ads-third-party.js

## The booking widget you embed on the same page

    embed.js
    analytics-share.js
    partner-audience.js

Please tell me what you intend to do.

=============== FILE: src/optOut.js ===============
'use strict';

const records = [];

function reset() {
  records.length = 0;
}

function isOptedOut(req) {
  const cookies = req.cookies || {};
  return cookies['do-not-sell'] === '1';
}

function submitOptOutForm(req) {
  records.push({ visitorId: req.visitorId, method: 'banner-form', at: req.at });
  return { setCookie: { 'do-not-sell': '1' } };
}

function recordsFor(visitorId) {
  return records.filter((r) => r.visitorId === visitorId);
}

module.exports = { reset, isOptedOut, submitOptOutForm, recordsFor };

=============== FILE: src/vendors.js ===============
'use strict';

const shares = [];
const directives = [];

function reset() {
  shares.length = 0;
  directives.length = 0;
}

function recordShare(vendorId, subjectRef, at) {
  shares.push({ vendorId, subjectRef, at });
}

function vendorsWithDataFor(subjectRef) {
  return [...new Set(shares.filter((s) => s.subjectRef === subjectRef).map((s) => s.vendorId))];
}

function sendDirective(vendorId, subjectRef, kind, at) {
  directives.push({ vendorId, subjectRef, kind, at });
  return { vendorId, kind, status: 'queued' };
}

function directivesFor(subjectRef) {
  return directives.filter((d) => d.subjectRef === subjectRef);
}

module.exports = { reset, recordShare, vendorsWithDataFor, sendDirective, directivesFor };

=============== FILE: src/page.js ===============
'use strict';

const { isOptedOut } = require('./optOut');
const vendors = require('./vendors');

const CORE_SCRIPTS = ['app.js', 'consent-banner.js'];
const SHARE_SCRIPTS = ['analytics-share.js', 'ads-third-party.js'];

function renderPage(req) {
  const scripts = [...CORE_SCRIPTS];
  if (!isOptedOut(req)) {
    scripts.push(...SHARE_SCRIPTS);
    SHARE_SCRIPTS.forEach((s) => vendors.recordShare(s.replace(/\.js$/, ''), req.visitorId, req.at));
  }
  return { status: 200, scripts };
}

module.exports = { renderPage, CORE_SCRIPTS, SHARE_SCRIPTS };

=============== FILE: src/embed.js ===============
'use strict';

const vendors = require('./vendors');

const CORE_SCRIPTS = ['embed.js'];
const SHARE_SCRIPTS = ['analytics-share.js', 'partner-audience.js'];

function renderEmbed(req) {
  const cookies = req.cookies || {};
  const scripts = [...CORE_SCRIPTS];
  if (cookies['do-not-sell'] !== '1') {
    scripts.push(...SHARE_SCRIPTS);
    SHARE_SCRIPTS.forEach((s) => vendors.recordShare(s.replace(/\.js$/, ''), req.visitorId, req.at));
  }
  return { status: 200, scripts };
}

module.exports = { renderEmbed, CORE_SCRIPTS, SHARE_SCRIPTS };

=============== FILE: src/corrections.js ===============
'use strict';

const vendors = require('./vendors');

function applyCorrection({ subjectRef, field, value, at }) {
  const recipients = vendors.vendorsWithDataFor(subjectRef);
  recipients.forEach((vendorId) => vendors.sendDirective(vendorId, subjectRef, 'correct', at));
  return { field, value, notified: recipients.length };
}

module.exports = { applyCorrection };

=============== FILE: src/optOut.cookie.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const optOut = require('./optOut');
const { renderPage } = require('./page');
const { renderEmbed } = require('./embed');

const VISITOR = { visitorId: 'v_8812', at: '2026-09-01T08:00:00Z' };

test('a visitor carrying the opt-out cookie gets no sharing scripts', () => {
  const res = renderPage({ ...VISITOR, cookies: { 'do-not-sell': '1' }, headers: {} });
  assert.ok(!res.scripts.includes('analytics-share.js'));
  assert.ok(!res.scripts.includes('ads-third-party.js'));
});

test('a visitor who has not opted out gets them', () => {
  const res = renderPage({ ...VISITOR, cookies: {}, headers: {} });
  assert.ok(res.scripts.includes('analytics-share.js'));
  assert.ok(res.scripts.includes('ads-third-party.js'));
});

test('the page still loads its own scripts either way', () => {
  const res = renderPage({ ...VISITOR, cookies: { 'do-not-sell': '1' }, headers: {} });
  assert.ok(res.scripts.includes('app.js'));
  assert.ok(res.scripts.includes('consent-banner.js'));
});

test('the banner form sets the cookie and writes a record', () => {
  optOut.reset();
  const result = optOut.submitOptOutForm({ ...VISITOR });
  assert.equal(result.setCookie['do-not-sell'], '1');
  assert.equal(optOut.recordsFor('v_8812').length, 1);
});

test('the embedded widget honours the cookie too', () => {
  const res = renderEmbed({ ...VISITOR, cookies: { 'do-not-sell': '1' }, headers: {} });
  assert.ok(!res.scripts.includes('partner-audience.js'));
  assert.ok(res.scripts.includes('embed.js'));
});

=============== FILE: src/corrections.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const vendors = require('./vendors');
const { applyCorrection } = require('./corrections');

const AT = '2026-08-14T09:00:00Z';

test('a correction reaches every vendor that already had the old value', () => {
  vendors.reset();
  vendors.recordShare('analytics-share', 'v_4410', AT);
  vendors.recordShare('partner-audience', 'v_4410', AT);
  vendors.recordShare('analytics-share', 'v_4411', AT);

  const result = applyCorrection({ subjectRef: 'v_4410', field: 'city', value: 'Oakland', at: AT });

  assert.equal(result.notified, 2);
  assert.deepEqual(
    vendors.directivesFor('v_4410').map((d) => d.vendorId).sort(),
    ['analytics-share', 'partner-audience'],
  );
  assert.equal(vendors.directivesFor('v_4411').length, 0);
});

test('a correction for a visitor no vendor holds notifies nobody', () => {
  vendors.reset();
  const result = applyCorrection({ subjectRef: 'v_9999', field: 'city', value: 'Fresno', at: AT });
  assert.equal(result.notified, 0);
});
