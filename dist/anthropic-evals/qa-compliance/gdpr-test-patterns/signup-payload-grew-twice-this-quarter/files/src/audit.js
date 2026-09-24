'use strict';

const entries = [];
let seq = 0;

function appendSignupEvent(received) {
  seq += 1;
  entries.push({ seq, at: '2026-09-01T00:00:00Z', kind: 'signup', received: { ...received } });
  return seq;
}

function auditEntries() {
  return entries.map((e) => ({ ...e, received: { ...e.received } }));
}

function recordedFields() {
  return [...new Set(entries.flatMap((e) => Object.keys(e.received)))];
}

function resetAudit() {
  entries.length = 0;
  seq = 0;
}

module.exports = { appendSignupEvent, auditEntries, recordedFields, resetAudit };
