const en = require('../locales/en.json');
const { pseudoLocalize } = require('./pseudo');

let current = 'en';

function setLocale(code) {
  current = code === 'en-XA' ? 'en-XA' : 'en';
  return current;
}

function currentLocale() {
  return current;
}

function interpolate(text, vars) {
  return text.replace(/\{\{(\w+)\}\}/g, (token, name) =>
    vars && Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : token,
  );
}

function t(key, vars) {
  const raw = Object.prototype.hasOwnProperty.call(en, key) ? en[key] : key;
  const text = current === 'en-XA' ? pseudoLocalize(raw) : raw;
  return interpolate(text, vars);
}

module.exports = { setLocale, currentLocale, t };
