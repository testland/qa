# Support ops folded severity into priority and the intake is already shipping it

## Problem Description

Anneke Voss, who runs support ops here at Palewell HR, cut the severity field out of
our defect intake ten days ago. Every item now carries one urgency value, P0 to P3,
and that value is both what the defect does to the customer and where it sits in the
queue.

Her case is a good one and she did the work to make it. She pulled 1,120 closed
defects, mapped the old severity band against the old priority band, and they agreed
in 94.2% of them. Two fields that say the same thing 94% of the time cost us about 38
seconds an item at intake and a standing argument at every triage meeting. The change
is merged - the intake module no longer stores severity, and the pre-filing gate no
longer looks at the pair.

Nobody has objected, which is roughly why I want a second pair of eyes on it before it
becomes how we work. Our contract extract and the write-up from the squad that piloted
this scheme in Q2 are attached, along with the intake code and the audit she ran.

There is also an email sitting in the queue that has not been processed yet - an
office manager at Bramblewood listing things that are wrong with the payroll portal.
Engineering triage here will not accept a single item spanning several unrelated
areas; one owner picks it up, one part gets fixed, the item closes and the rest is
gone. Whatever you hand over has to survive that.

## Output Specification

1. Edit `src/bug-record.js` and `src/triage-gate.js` as your conclusion requires. If
   you conclude the shipped scheme is wrong, do not leave it in place.
2. Add tests to `test/triage-gate.test.js` that would fail against the scheme you
   rejected, or pass against the one you kept. The suite must run clean under
   `npm test`.
3. Write `docs/classification-decision.md` - the answer to Anneke: what an intake
   record has to carry, which attached document that is derived from, and what to do
   about the 38 seconds an item if you are not shipping her change.
4. Write `reports/bramblewood-intake.md` - the queued email, processed under whatever
   scheme you land on, ready for engineering to pick up. The account manager gets one
   more reply from the customer, so anything we still need from her belongs in this
   file, attached to the thing it belongs to.

Out of scope: opening the tracker, investigating any of the reported failures, or
writing to the customer yourself.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "palewell-intake",
  "version": "2.4.0",
  "type": "commonjs",
  "scripts": { "test": "node --test" }
}

=============== FILE: src/bug-record.js ===============
'use strict';

const URGENCY = ['P0', 'P1', 'P2', 'P3'];

// Single-field intake since 2026-08-03; the old severity key is accepted and ignored.
function makeRecord(input) {
  const { id, title, surface, urgency, steps, commit, observed, expected } = input;
  if (!id || !title || !surface) throw new Error('id, title and surface are required');
  if (!URGENCY.includes(urgency)) throw new Error(`urgency must be one of ${URGENCY.join(', ')}`);
  return {
    id,
    title,
    surface,
    urgency,
    steps: steps ?? [],
    commit: commit ?? null,
    observed: observed ?? null,
    expected: expected ?? null,
    state: 'New',
  };
}

module.exports = { makeRecord, URGENCY };

=============== FILE: src/triage-gate.js ===============
'use strict';

const REQUIRED = ['id', 'title', 'surface', 'urgency'];

// Pre-filing audit: findings plus one verdict. Blocks are hard stops for the filer.
function audit(record) {
  const findings = [];

  for (const field of REQUIRED) {
    if (!record[field]) findings.push({ rule: 'required-fields', level: 'block', detail: `missing ${field}` });
  }
  if (record.title && / and /i.test(record.title)) {
    findings.push({ rule: 'single-clause-title', level: 'block', detail: 'title joins two failures' });
  }
  if (!record.commit || !/^[0-9a-f]{7,40}$/.test(record.commit)) {
    findings.push({ rule: 'repro-pinned', level: 'block', detail: 'reproduction is not pinned to a commit' });
  }
  // pair check dropped with the single-field intake, AV 2026-08-03

  const blocked = findings.some((f) => f.level === 'block');
  return { verdict: blocked ? 'block' : findings.length ? 'pass-with-caveats' : 'pass', findings };
}

module.exports = { audit, REQUIRED };

=============== FILE: test/triage-gate.test.js ===============
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { makeRecord } = require('../src/bug-record');
const { audit } = require('../src/triage-gate');

function record(overrides = {}) {
  return makeRecord({
    id: 'PW-4410',
    title: 'Year-to-date column missing from payroll export',
    surface: 'payroll export',
    severity: 'Major',
    urgency: 'P2',
    steps: ['Open Payroll then Export', 'Download the finance file'],
    commit: '9c1f4ab',
    observed: 'The downloaded file has no year-to-date column',
    expected: 'The downloaded file carries the year-to-date column',
    ...overrides,
  });
}

test('a complete record passes the gate', () => {
  assert.strictEqual(audit(record()).verdict, 'pass');
});

test('a title joining two failures is blocked', () => {
  const r = audit(record({ title: 'Export column missing and reports page slow' }));
  assert.strictEqual(r.verdict, 'block');
  assert.ok(r.findings.some((f) => f.rule === 'single-clause-title'));
});

test('a reproduction that is not pinned to a commit is blocked', () => {
  const r = audit(record({ commit: 'Production' }));
  assert.strictEqual(r.verdict, 'block');
  assert.ok(r.findings.some((f) => f.rule === 'repro-pinned'));
});

test('a record with no surface is blocked', () => {
  const r = audit({ ...record(), surface: '' });
  assert.strictEqual(r.verdict, 'block');
  assert.ok(r.findings.some((f) => f.detail === 'missing surface'));
});

=============== FILE: inbox/anneke-note.md ===============
From:    Anneke Voss (support ops)
To:      all-engineering
Date:    2026-08-03
Subject: One urgency field from today

Short version: severity is gone from intake. Everything carries one urgency, P0 to P3.

I looked at every defect we closed in the last four quarters - 1,120 of them - and
mapped severity onto priority. They land on the same band 94.2% of the time. We are
paying twice for one judgement: about 38 seconds per item at intake, and a five minute
argument at triage whenever somebody disagrees with themselves about which is which.

The intake module and the pre-filing gate are already updated. The old severity key
still parses so nothing breaks, it just is not stored any more.

If someone wants the second field back, the bar is a case that the 5.8% is worth the
94.2%.

=============== FILE: data/field-audit.md ===============
# Severity / priority agreement, 2025-Q3 through 2026-Q2

Source: intake export, closed defects only, n = 1,120.

| Band pair (severity -> priority) | Count | Share |
|---|---|---|
| agreed one-for-one | 1,055 | 94.2% |
| disagreed by one band or more | 65 | 5.8% |

Cost measured at intake: median 38 seconds per item spent on the second field.

Cross-check requested by the reviewer and added afterwards: of the 12 defects in the
same period that were escalated to a reportable incident, **9 sit in the 65-item
disagreement set**. The remaining 3 agreed at Critical / P0.

Note from the analyst: the disagreement set is small but it is not random. It is
almost entirely made up of two shapes - low customer impact that had to be fixed
immediately for a launch or a demo, and high customer impact that was legitimately
deferred because the surface was behind a flag or restricted to one account.

=============== FILE: docs/support-sla.md ===============
# Palewell HR - Standard plan support schedule (contract extract)

Clause 7.2, quoted from the signed agreement. This text is identical in all 214
Standard plan contracts.

> **7.2 Defect response.** Supplier shall classify each reported defect by
> **severity**, defined solely by its effect on the Customer's use of the Service:
>
> | Severity | Definition | Acknowledgement | Workaround |
> |---|---|---|---|
> | Critical | Payroll cannot be run, or payroll output is incorrect, or Customer data is lost or exposed | 4 business hours | 1 business day |
> | Major | A documented function is unusable with no workaround | 1 business day | 5 business days |
> | Moderate | A documented function is impaired or has a workaround | 3 business days | next release |
> | Minor | Cosmetic or documentation defect | 10 business days | no commitment |
>
> Severity is determined by the definitions above and not by Supplier's internal
> scheduling. **The order in which Supplier elects to perform work is not a term of
> this agreement** and shall not alter the acknowledgement and workaround times owed.

Compliance note: the annual assurance pull samples closed defects **by severity band**
and checks the acknowledgement timestamps against 7.2. There is no other field in our
data that the sample can be drawn on.

=============== FILE: docs/incident-pw-318.md ===============
# PW-318 - two payroll cycles run on incorrect year-to-date figures

**Customer:** Dunmore Freight (Standard plan, legacy pricing, 96 employees)
**Cycles affected:** 2026-04-30 and 2026-05-29. 192 payslips restated. Customer had to
amend its own filing.

## How it was classified

The payroll squad was six weeks into a pilot of the single-urgency intake when the
defect was reported on 2026-04-24. It was logged **P3**. The filer's note reads:
"one customer, legacy plan, we have a release going out Friday".

Under the definitions in clause 7.2 the defect is **Critical** - payroll output was
incorrect - which owes a 4 business hour acknowledgement and a workaround inside 1
business day. Nothing in the record contradicts that. The problem is that once the
single field was set to P3 there was no longer a field in which the Critical
classification could exist, so the contractual clock was never started. The customer
was acknowledged on day 9.

The P3 itself was a defensible scheduling call at the time. One customer out of 214,
on a plan being retired, against a release the squad had already committed to.

## Actions

1. Pilot ended; squad returned to the two-field intake. **Done.**
2. Restore an impact classification that is recorded and scored independently of the
   queue position, so the response clock can be driven by the first and the work order
   by the second. **Open - no owner.**
3. Rework the year-to-date accumulator. **Done, shipped 5.1.2.**

=============== FILE: inbox/forwarded-email.md ===============
From:    Rachel Okonjo <r.okonjo@bramblewood-logistics.example>
To:      accounts@palewell-hr.example
Subject: Fwd: portal problems - need these sorted
Date:    2026-08-13 16:48 (+01:00)

Hi Tom,

Sorry to pile on but a few things are going wrong at once and payroll runs Friday.

The main one is the export. When I download the payroll file for the finance team the
year-to-date column just isn't there any more. It used to be there. The finance team
can't reconcile without it and they've had to do last month by hand.

Also two of my team can't sign in at all - they put in their work email, it takes them
off to the sign-in page, and then it just dumps them back at our login screen again.
Round and round. Everyone else is fine. I've reset their passwords twice.

And the reports page takes forever now. It's been like this since Monday, though
honestly it's never been quick since we came on board in June. I click into the
headcount report and go make a coffee.

Can you get someone to look before Friday please.

Rachel

--- account manager's note ---

Bramblewood Logistics, ~180 employees, on the Standard plan. Rachel is the only admin.
I didn't ask her anything else, sorry, I was on my way into a call. She's on Windows at
the office, don't know about the two who can't sign in.
