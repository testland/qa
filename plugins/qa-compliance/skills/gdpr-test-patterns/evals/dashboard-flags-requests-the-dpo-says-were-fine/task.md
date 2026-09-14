# Our overdue list disagrees with the DPO

## Problem Description

The compliance dashboard calls `isOverdue()` for every access request in the
case file and shows anything it calls late on a red list. We are three days from
turning that list into automatic escalation mail to the DPO and the board, and
she has asked me to stop.

She went through the requests in `src/sarRequests.js` by hand against the paper
case files last week and she disagrees with the dashboard on several of them.
She would not tell me which, on the grounds that if I have to ask then the code
is not encoding our obligation, it is encoding somebody's memory of it.

So: encode the obligation, and make the code able to show its working for every
request in the file. Today's date for evaluation purposes is 2026-06-10.

The escalation mail goes to the board, so whatever comes out of this has to be
something I can defend one line at a time.

## Output Specification

1. Write `docs/sar-deadline-findings.md` with a line per request id in
   `src/sarRequests.js`: what the dashboard says today, what the correct answer
   is, and on what basis.
2. Correct `src/sarDeadline.js`.
3. Add test coverage for the requests in the case file. Put it in
   `src/sarDeadline.cases.test.js`.
4. Run `npm test` before you finish; it must pass, and the three tests already in
   `src/sarDeadline.test.js` must still pass unchanged.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "dsr-casefile",
  "version": "2.4.1",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: docs/privacy-policy-extract.md ===============
# Data-subject request handling — extract from the privacy operations policy

Version 4.1. Approved by the DPO 2026-01-12. This extract is the controlling
statement of our response obligation; the dashboard is meant to implement it.

## 3.2 Response deadline

We answer a subject access request within one month of receipt.

Where a request is complex, or where a subject has made a number of requests
together, that period may be extended by two further months.

Where we extend, we inform the subject of the extension and of the reasons for
it within one month of receipt.

## 3.3 Complexity determination

Whether a request is complex is a determination the DPO records on the request
itself. A request carrying no recorded determination has not had one made
against it in the case-management system; where the request predates the
migration on 2026-04-15 a determination may exist only in the paper file.

## 3.4 Escalation

A request is escalated only where the position is established on the record.
Anything that turns on a determination we cannot evidence goes back to the DPO
before it goes anywhere else.

=============== FILE: src/sarRequests.js ===============
'use strict';

const requests = [
  { id: 'sar_101', subject: 'lea.brandt@example.net', receivedAt: '2026-03-02', complex: false, extensionNoticeSentAt: null, completedAt: '2026-03-20' },
  { id: 'sar_102', subject: 'tomas.iversen@example.net', receivedAt: '2026-03-04', complex: false, extensionNoticeSentAt: null, completedAt: '2026-04-07' },
  { id: 'sar_103', subject: 'marta.oliveira@example.net', receivedAt: '2026-03-09', complex: true, extensionNoticeSentAt: '2026-03-24', completedAt: '2026-04-25' },
  { id: 'sar_104', subject: 'jonas.weber@example.net', receivedAt: '2026-02-10', complex: true, extensionNoticeSentAt: '2026-03-20', completedAt: '2026-04-02' },
  { id: 'sar_105', subject: 'aoife.nolan@example.net', receivedAt: '2026-01-05', complex: true, extensionNoticeSentAt: '2026-01-20', completedAt: '2026-05-04' },
  { id: 'sar_106', subject: 'pieter.vos@example.net', receivedAt: '2026-04-01', complex: null, extensionNoticeSentAt: '2026-04-10', completedAt: '2026-05-28' },
  { id: 'sar_107', subject: 'hana.kral@example.net', receivedAt: '2026-05-20', complex: false, extensionNoticeSentAt: null, completedAt: null },
  { id: 'sar_108', subject: 'ida.lindqvist@example.net', receivedAt: '2026-02-15', complex: false, extensionNoticeSentAt: null, completedAt: '2026-03-16' },
  { id: 'sar_109', subject: 'noor.el-amrani@example.net', receivedAt: '2026-01-31', complex: false, extensionNoticeSentAt: null, completedAt: '2026-03-02' },
];

function all() {
  return requests.map((r) => ({ ...r }));
}

function byId(id) {
  const found = requests.find((r) => r.id === id);
  return found ? { ...found } : null;
}

module.exports = { all, byId };

=============== FILE: src/sarDeadline.js ===============
'use strict';

const DAY_MS = 86400000;

function deadlineFor(request) {
  return new Date(Date.parse(request.receivedAt) + 30 * DAY_MS).toISOString().slice(0, 10);
}

function isOverdue(request, now) {
  const end = Date.parse(request.completedAt || now);
  return end > Date.parse(deadlineFor(request));
}

module.exports = { deadlineFor, isOverdue };

=============== FILE: src/sarDeadline.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { byId } = require('./sarRequests');
const { isOverdue } = require('./sarDeadline');

const TODAY = '2026-06-10';

test('a request answered inside its window is not overdue', () => {
  assert.equal(isOverdue(byId('sar_101'), TODAY), false);
});

test('a request answered after its window closed is overdue', () => {
  assert.equal(isOverdue(byId('sar_102'), TODAY), true);
});

test('a request still open and inside its window is not overdue', () => {
  assert.equal(isOverdue(byId('sar_107'), TODAY), false);
});

=============== FILE: src/dashboard.js ===============
'use strict';

const { all } = require('./sarRequests');
const { isOverdue } = require('./sarDeadline');

function redList(now) {
  return all()
    .filter((r) => isOverdue(r, now))
    .map((r) => ({ id: r.id, subject: r.subject, receivedAt: r.receivedAt }));
}

module.exports = { redList };
