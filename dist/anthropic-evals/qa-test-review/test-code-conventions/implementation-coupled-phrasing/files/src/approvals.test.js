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
