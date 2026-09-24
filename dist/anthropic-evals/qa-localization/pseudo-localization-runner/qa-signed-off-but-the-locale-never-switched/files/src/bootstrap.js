const { setLocale, currentLocale } = require('./i18n');
const { renderToolbar } = require('./toolbar');

function start(env) {
  setLocale((env && env.LOCALE) || 'en');
  return { locale: currentLocale(), toolbar: renderToolbar() };
}

module.exports = { start };
