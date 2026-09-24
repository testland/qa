const RATES = { GB: 0.2, IE: 0.23, US: 0 };

export function lineTotal(item) {
  return item.unitPrice * item.qty;
}

export function subtotal(items) {
  return items.reduce((sum, item) => sum + lineTotal(item), 0);
}

export function taxFor(items, country) {
  const rate = RATES[country];
  if (rate === undefined) throw new Error(`no tax rate for ${country}`);
  return Math.round(subtotal(items) * rate);
}

export function cartTotal(items, country) {
  return subtotal(items) + taxFor(items, country);
}
