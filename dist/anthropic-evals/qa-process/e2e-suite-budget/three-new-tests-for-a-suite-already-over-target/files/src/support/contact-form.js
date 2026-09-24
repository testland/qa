'use strict';

const PLACEHOLDERS = {
  subject: 'What is this about?',
  body: 'Tell us what happened and we will come back to you',
};

function placeholder(field) {
  if (!(field in PLACEHOLDERS)) throw new Error(`unknown field: ${field}`);
  return PLACEHOLDERS[field];
}

module.exports = { placeholder };
