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
