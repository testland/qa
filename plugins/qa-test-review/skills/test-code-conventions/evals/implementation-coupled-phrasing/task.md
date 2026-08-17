# Approval tests describe our columns, not our rules

## Problem Description

Every test in `src/approvals.test.js` is named after the storage. When the
approval rules were explained to the compliance reviewer she asked to read the
tests, and got names like `submit sets statusCode to 1 and pushes onto audit`.
She could not tell from any of them what a document has to do to become
approved.

The names are not just unhelpful, they are unstable. We are moving
`statusCode` off integers onto strings next quarter. Nothing about approval
behaviour changes, and yet every test name in the file becomes a lie, along
with most of the checks, which reach into the raw arrays and the numeric codes
rather than going through the module's own predicates.

There is one place where the opposite problem exists. `completeReview` runs
both approvals in one call. In the test about the audit trail that is fine -
the trail is what that test is about. In the test named for the two-approval
rule it is not: the number of approvals is the entire subject of that test, and
the body no longer shows it. That test would pass if the rule became
one approval, or five.

## Output Specification

1. Rename every test in `src/approvals.test.js` so the names would survive the
   `statusCode` change unaltered and read as the approval rules themselves.
2. Express the checks through what the module offers for asking about a
   document's state, rather than through its stored codes and arrays.
3. Make the test about the two-approval rule show that rule in its own body.
4. Every behaviour asserted today must still be asserted.
5. Produce `naming-review.md` with the old and new name of each test and one
   line on what made the old one unstable.

Do not change `src/approvals.js`.

Run `npm test` before you finish; it must pass.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "approvals",
  "version": "2.3.0",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/approvals.js ===============
'use strict';

const STATUS = { draft: 0, pending: 1, approved: 2, rejected: 3 };
const APPROVALS_REQUIRED = 2;

function createDocument(id) {
  return { id, statusCode: STATUS.draft, approvals: [], audit: [] };
}

function submit(doc, author) {
  doc.statusCode = STATUS.pending;
  doc.audit.push({ event: 'submitted', by: author });
  return doc;
}

function approve(doc, reviewer) {
  if (doc.statusCode !== STATUS.pending) {
    throw new Error('Only a submitted document can be approved');
  }
  doc.approvals.push(reviewer);
  doc.audit.push({ event: 'approved', by: reviewer });
  if (doc.approvals.length >= APPROVALS_REQUIRED) {
    doc.statusCode = STATUS.approved;
  }
  return doc;
}

function reject(doc, reviewer, reason) {
  doc.statusCode = STATUS.rejected;
  doc.audit.push({ event: 'rejected', by: reviewer, reason });
  return doc;
}

const isPending = (doc) => doc.statusCode === STATUS.pending;
const isApproved = (doc) => doc.statusCode === STATUS.approved;
const isRejected = (doc) => doc.statusCode === STATUS.rejected;
const auditTrail = (doc) => doc.audit.map((entry) => entry.event);
const rejectionReason = (doc) => (doc.audit.find((e) => e.event === 'rejected') || {}).reason;

module.exports = {
  createDocument,
  submit,
  approve,
  reject,
  isPending,
  isApproved,
  isRejected,
  auditTrail,
  rejectionReason,
};

=============== FILE: src/approvals.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createDocument, submit, approve, reject } = require('./approvals');

function completeReview(doc) {
  approve(doc, 'reviewer-a');
  approve(doc, 'reviewer-b');
  return doc;
}

test('submit sets statusCode to 1 and pushes onto audit', () => {
  const doc = createDocument('doc-1');

  submit(doc, 'ada');

  assert.equal(doc.statusCode, 1);
  assert.equal(doc.audit.length, 1);
});

test('approve pushes the reviewer onto the approvals array', () => {
  const doc = submit(createDocument('doc-2'), 'ada');

  approve(doc, 'reviewer-a');

  assert.equal(doc.approvals.length, 1);
  assert.equal(doc.statusCode, 1);
});

test('approve sets statusCode to 2 once approvals.length reaches 2', () => {
  const doc = submit(createDocument('doc-3'), 'ada');

  completeReview(doc);

  assert.equal(doc.statusCode, 2);
});

test('reject sets statusCode to 3 and writes a reason field', () => {
  const doc = submit(createDocument('doc-4'), 'ada');

  reject(doc, 'reviewer-a', 'missing figures');

  assert.equal(doc.statusCode, 3);
  assert.equal(doc.audit[1].reason, 'missing figures');
});

test('approve throws when statusCode is not 1', () => {
  const doc = createDocument('doc-5');

  assert.throws(() => approve(doc, 'reviewer-a'), /submitted document/);
});

test('the audit array holds one entry per event in order', () => {
  const doc = submit(createDocument('doc-6'), 'ada');

  completeReview(doc);

  assert.deepEqual(
    doc.audit.map((entry) => entry.event),
    ['submitted', 'approved', 'approved'],
  );
});
