'use strict';

const vendors = require('./vendors');

function applyCorrection({ subjectRef, field, value, at }) {
  const recipients = vendors.vendorsWithDataFor(subjectRef);
  recipients.forEach((vendorId) => vendors.sendDirective(vendorId, subjectRef, 'correct', at));
  return { field, value, notified: recipients.length };
}

module.exports = { applyCorrection };
