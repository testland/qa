# A release was pulled on the strength of the results-letter report

## Problem Description

Brightpath Health runs a patient portal. A patient rang the helpdesk twice about
downloading a results letter, and Colm Doherty, our clinical safety officer, filed
BP-2291 from the agent's notes on Thursday night.

He classified it Reproducibility: Always, Severity: Critical, Priority: P0. Our safety
procedure is explicit that a Critical defect in a clinical document path with
reproducibility Always triggers an automatic rollback of the release in flight, so
8.4.0 went back to 8.3.6 at 23:40 that night. Colm wants the report confirmed at
Thursday's clinical safety review and a supplier incident notice raised against the
document service vendor.

I do not think anyone did anything unreasonable here. A patient could not get her
results letter out of a regulated portal and the procedure did what it says.

What I want before Thursday is somebody who has actually looked at the download audit
log deciding whether the report says what the evidence says. The review has to
formally retract any claim that turns out to have been assumed rather than reported,
and it will read the file without the call notes in front of it.

The notes, Colm's filed report, the audit log for the release window and the rollback
record are attached, with the small parser we use to read the log.

## Output Specification

1. Write `reports/bp-2291-review.md` - the verdict for the safety review: which
   statements in BP-2291 the evidence supports, which it does not, and what you
   recommend about the release that was pulled and about the supplier notice.
2. Write `reports/results-letter-download.md` - the report for whatever defect the
   evidence does support, written so an engineer can pick it up cold.
3. Add a test to `test/download-audit.test.js` that settles the reproducibility
   question. The suite must run clean under `npm test`.

Out of scope: changing any portal code, contacting the patient, or opening the
document service.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "brightpath-audit",
  "version": "1.0.0",
  "type": "commonjs",
  "scripts": { "test": "node --test" }
}

=============== FILE: src/download-audit.js ===============
'use strict';
const { readFileSync } = require('node:fs');

function parse(text) {
  const [header, ...lines] = text.trim().split(/\r?\n/);
  const cols = header.split(',');
  return lines
    .filter((line) => line.trim())
    .map((line) => {
      const cells = line.split(',');
      const row = {};
      cols.forEach((c, i) => {
        row[c] = cells[i];
      });
      row.http = Number(row.http);
      row.bytes = Number(row.bytes);
      return row;
    });
}

function load(path) {
  return parse(readFileSync(path, 'utf8'));
}

function countByOutcome(rows) {
  const out = {};
  for (const r of rows) out[r.outcome] = (out[r.outcome] ?? 0) + 1;
  return out;
}

function forAccount(rows, account) {
  return rows.filter((r) => r.account === account);
}

module.exports = { parse, load, countByOutcome, forAccount };

=============== FILE: test/download-audit.test.js ===============
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { load, countByOutcome, forAccount } = require('../src/download-audit');

const rows = load(path.join(__dirname, '..', 'logs', 'letter-downloads.csv'));

test('every logged request parses', () => {
  assert.strictEqual(rows.length, 26);
  assert.ok(rows.every((r) => r.http === 200));
});

test('most requests in the window returned a letter', () => {
  assert.strictEqual(countByOutcome(rows).OK, 17);
});

test('the account that called the helpdesk appears in the log', () => {
  assert.ok(forAccount(rows, 'PT-70318').length > 0);
});

=============== FILE: logs/letter-downloads.csv ===============
ts,account,letter_id,app_version,http,bytes,outcome
2026-08-03T10:12:44Z,PT-58890,L-87301,8.3.6,200,203118,OK
2026-08-04T09:02:10Z,PT-58890,L-87455,8.3.6,200,1148,AWAITING_COUNTERSIGN
2026-08-04T11:47:59Z,PT-61204,L-87460,8.3.6,200,188204,OK
2026-08-05T08:31:22Z,PT-61204,L-87502,8.3.6,200,1148,AWAITING_COUNTERSIGN
2026-08-05T09:14:03Z,PT-61204,L-87502,8.3.6,200,176990,OK
2026-08-06T14:20:41Z,PT-58890,L-87455,8.3.6,200,1148,AWAITING_COUNTERSIGN
2026-08-06T15:02:17Z,PT-58890,L-87455,8.3.6,200,211774,OK
2026-08-07T09:55:38Z,PT-70318,L-87960,8.3.6,200,198442,OK
2026-08-08T13:11:05Z,PT-49112,L-88004,8.3.6,200,1148,AWAITING_COUNTERSIGN
2026-08-08T16:40:52Z,PT-49112,L-88004,8.3.6,200,164003,OK
2026-08-09T10:05:19Z,PT-77031,L-88120,8.3.6,200,220561,OK
2026-08-10T08:22:47Z,PT-66450,L-88188,8.3.6,200,1148,AWAITING_COUNTERSIGN
2026-08-10T09:01:30Z,PT-66450,L-88188,8.3.6,200,190448,OK
2026-08-11T07:44:12Z,PT-77031,L-88377,8.4.0,200,205990,OK
2026-08-11T08:52:14Z,PT-70318,L-88413,8.4.0,200,1148,AWAITING_COUNTERSIGN
2026-08-11T08:57:02Z,PT-70318,L-88413,8.4.0,200,1148,AWAITING_COUNTERSIGN
2026-08-11T09:03:41Z,PT-70318,L-88413,8.4.0,200,1148,AWAITING_COUNTERSIGN
2026-08-11T09:51:07Z,PT-70318,L-88413,8.4.0,200,241733,OK
2026-08-11T10:30:55Z,PT-61204,L-88420,8.4.0,200,182233,OK
2026-08-12T09:12:08Z,PT-77031,L-88502,8.4.0,200,1148,AWAITING_COUNTERSIGN
2026-08-12T10:03:44Z,PT-77031,L-88502,8.4.0,200,193817,OK
2026-08-12T15:41:20Z,PT-58890,L-88530,8.4.0,200,201002,OK
2026-08-13T08:20:11Z,PT-49112,L-88601,8.4.0,200,172559,OK
2026-08-13T12:55:36Z,PT-66450,L-88622,8.4.0,200,187441,OK
2026-08-14T09:33:27Z,PT-70318,L-88700,8.4.0,200,199310,OK
2026-08-14T14:18:02Z,PT-61204,L-88711,8.4.0,200,178865,OK

=============== FILE: inbox/helpdesk-notes.md ===============
Helpdesk notes - Brightpath Health patient portal
Written up 2026-08-14 by agent K. Mensah, covering calls on the 11th and 14th
(notes reconstructed after the second call, no recording kept)

Patient: female, 60s, calls herself "not very technical". Account PT-70318, verified on
date of birth. Consented to us logging the issue. Declined a remote session.

What she said, as close as I can remember:

  - "It never works. I click the download and nothing comes."
  - Later in the same call: "It worked the week before, that's how I know the letter is
    there."
  - On the second call: "I tried it three times on the trot and the third one did come
    down but it was empty."
  - Asked what empty meant: "there was nothing in it." I asked whether it opened at all
    and she said she wasn't sure, her son opened it.
  - "My daughter tried it on her laptop at her house and it came down fine." I did not
    establish whether the daughter logged in as herself or as her mother, or whether it
    was the same letter.
  - She uses "the computer in the back room". No browser named. Asked her to read
    anything off the screen and she preferred not to.
  - She could not say which letter or which appointment date, only "the results one
    from the hospital".

Agent note: I have not tried to reproduce this myself. I don't have a test patient with
a results letter attached.

=============== FILE: inbox/bp-2291.md ===============
BP-2291 - filed 2026-08-14 22:15 by C. Doherty (clinical safety)

## Patients cannot download results letters from the portal

**Severity:** Critical
**Priority:** P0
**Reproducibility:** Always

### Environment

- **App / Build:** 8.4.0
- **OS:** Windows 11
- **Browser:** Chrome (latest)
- **Device:** desktop

### Steps to reproduce

1. Sign in to the patient portal as a patient with a results letter.
2. Open Letters.
3. Click Download on the results letter.
4. Either nothing downloads, or an empty file is produced.

### Expected

The results letter downloads and opens.

### Actual

No file, or an empty file. Patient reports this on every attempt.

### Notes

Two calls from the same patient. Given the document path and the regulated context I
have classified this Critical / Always, which under the safety procedure requires the
release in flight to be rolled back - requested and completed tonight. Raising a
supplier incident notice against the document service vendor in the morning. Asking
the safety review to confirm both on Thursday.

=============== FILE: docs/rollback-8-4-0.md ===============
# Release 8.4.0 - deploy and rollback record

| Event | When | By |
|---|---|---|
| 8.4.0 deployed to production | 2026-08-10 22:10 | release automation |
| Rolled back to 8.3.6 | 2026-08-14 23:40 | on-call, on BP-2291 |

## What 8.4.0 contained

- **SAFE-77 fix** - the medication summary truncated the allergy list at five entries;
  a sixth and subsequent allergies were not displayed. Three confirmed occurrences,
  classified Critical, open since 2026-07-02. This was the reason 8.4.0 was expedited.
- Appointment reminder wording changes (copy only).
- Dependency bump for the charting library.

**No change was made to the letter download path in 8.4.0.** The counter-signature gate
on clinical letters has behaved the same way since 7.2 (November 2025) and was not
touched by this release.

## Standing risk note

8.3.6 does not contain the SAFE-77 fix. While production is on 8.3.6 the allergy list
truncation is live again. This is logged as an accepted risk pending re-release and has
to be reported to the safety review if it is still open on Thursday.
