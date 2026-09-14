const { init, setLocale, currentLocale } = require('./i18n');

function start(env) {
  init();
  setLocale((env && env.LOCALE) || 'en');
  return { locale: currentLocale() };
}

module.exports = { start };
