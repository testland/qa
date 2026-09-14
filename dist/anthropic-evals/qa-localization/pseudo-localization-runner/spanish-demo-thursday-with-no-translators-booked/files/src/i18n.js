const { BUNDLES } = require('./locales');

let current = 'en';

function setLocale(code) {
  if (BUNDLES[code]) {
    current = code;
    return true;
  }
  return false;
}

function t(key) {
  const bundle = BUNDLES[current] || BUNDLES.en;
  return bundle[key] || BUNDLES.en[key] || key;
}

module.exports = { setLocale, t };
