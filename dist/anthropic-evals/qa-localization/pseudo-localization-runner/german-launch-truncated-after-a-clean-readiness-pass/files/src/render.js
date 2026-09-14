const en = require('../locales/en.json');
const { BUDGETS, overflows } = require('./layout');

function fit(text, budget) {
  if (budget === undefined) return text;
  return text.length > budget ? text.slice(0, budget - 1) + '…' : text;
}

function renderSurface(key, translate) {
  const text = translate ? translate(en[key]) : en[key];
  return { key, text: fit(text, BUDGETS[key]), clipped: overflows(text, key) };
}

function renderAll(translate) {
  return Object.keys(en).map((key) => renderSurface(key, translate));
}

module.exports = { renderSurface, renderAll };
