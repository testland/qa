const en = require('../locales/en.json');
const { pseudoLocalize } = require('./pseudo');

function generateBundle(source) {
  const out = {};
  for (const [key, value] of Object.entries(source)) {
    out[key] = pseudoLocalize(value);
  }
  return out;
}

const BUNDLES = {
  en: en,
  'en-XA': generateBundle(en),
  // TODO(marco, 2026-08-11): placeholder until the vendor delivers. LOC-212.
  'es-ES': generateBundle(en),
};

// Codes offered in the in-app language picker.
const SUPPORTED_LOCALES = ['en', 'es-ES'];

module.exports = { BUNDLES, SUPPORTED_LOCALES, generateBundle };
