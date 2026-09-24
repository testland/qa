'use strict';

const store = new Map();

function replaceCategory(categoryId, rows) {
  const previous = store.get(categoryId) ?? [];
  store.set(categoryId, rows);
  return previous;
}

function productsIn(categoryId) {
  return store.get(categoryId) ?? [];
}

function load(seed) {
  for (const [key, rows] of Object.entries(seed)) {
    store.set(Number(key.replace('category', '')), rows);
  }
}

module.exports = { products: { replaceCategory, productsIn, load } };
