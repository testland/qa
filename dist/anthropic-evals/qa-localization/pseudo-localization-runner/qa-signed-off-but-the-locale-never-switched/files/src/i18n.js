const en = require('../locales/en.json');
const { pseudoLocalize } = require('./pseudo');

let current = 'en';

function setLocale(code) {
  current = code === 'en-XA' ? 'en-XA' : 'en';
  return current === code;
}

function currentLocale() {
  return current;
}

function t(key) {
  const raw = Object.prototype.hasOwnProperty.call(en, key) ? en[key] : key;
  return current === 'en-XA' ? pseudoLocalize(raw) : raw;
}

module.exports = { setLocale, currentLocale, t };
