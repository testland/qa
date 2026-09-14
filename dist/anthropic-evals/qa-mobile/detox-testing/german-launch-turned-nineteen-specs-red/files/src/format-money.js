'use strict';

const SPACES = /[   ]/g;

const CURRENCY_BY_LOCALE = { 'en-US': 'USD', 'de-DE': 'EUR', 'ar-EG': 'EGP' };

function currencyFor(locale) {
  const c = CURRENCY_BY_LOCALE[locale];
  if (!c) throw new RangeError(`no currency configured for ${locale}`);
  return c;
}

function formatMoney(cents, locale) {
  const nf = new Intl.NumberFormat(locale, { style: 'currency', currency: currencyFor(locale) });
  return nf.format(cents / 100).replace(SPACES, ' ');
}

function isRtl(locale) {
  return ['ar', 'he', 'fa', 'ur'].includes(String(locale).split('-')[0]);
}

module.exports = { CURRENCY_BY_LOCALE, currencyFor, formatMoney, isRtl };
