const en = require('../locales/en.json');
const { pseudoLocalize, mirrorLocalize } = require('./pseudo');

let current = 'en';

function setLocale(code) {
  current = code === 'en-XA' || code === 'en-XB' ? code : 'en';
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

function transform(raw) {
  if (current === 'en-XA') return pseudoLocalize(raw);
  if (current === 'en-XB') return mirrorLocalize(raw);
  return raw;
}

function t(key, vars) {
  const raw = Object.prototype.hasOwnProperty.call(en, key) ? en[key] : key;
  return interpolate(transform(raw), vars);
}

module.exports = { setLocale, currentLocale, t };
