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
