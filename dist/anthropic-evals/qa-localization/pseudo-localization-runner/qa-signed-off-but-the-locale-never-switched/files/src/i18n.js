const en = require('../locales/en.json');
const { pseudoLocalize } = require('./pseudo');

let current = 'en';
let registered = false;

function init(options) {
  registered = (options || {}).accented === true;
  current = 'en';
}

function setLocale(code) {
  if (code === 'en-XA') {
    if (!registered) return false;
    current = 'en-XA';
    return true;
  }
  current = 'en';
  return code === 'en';
}

function currentLocale() {
  return current;
}

function t(key) {
  const raw = Object.prototype.hasOwnProperty.call(en, key) ? en[key] : key;
  return current === 'en-XA' ? pseudoLocalize(raw) : raw;
}

module.exports = { init, setLocale, currentLocale, t };
