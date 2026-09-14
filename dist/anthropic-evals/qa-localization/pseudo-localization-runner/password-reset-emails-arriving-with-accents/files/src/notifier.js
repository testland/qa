const strings = require('../locales/en.json');
const { PSEUDO_LOCALE } = require('./flags');
const { pseudoLocalize } = require('./pseudo');

function line(key) {
  const raw = strings[key];
  return PSEUDO_LOCALE ? pseudoLocalize(raw) : raw;
}

function resetEmail(to) {
  return {
    to,
    subject: line('reset.subject'),
    body: [line('reset.body'), line('reset.cta'), line('reset.expiry')].join('\n'),
  };
}

module.exports = { resetEmail, line };
