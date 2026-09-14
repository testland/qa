'use strict';

// pricing-service: POST /v1/quotes -> { currency, subtotal_cents,
//   discount_amount_cents, tax_cents, total_cents, breakdown[], quote_id,
//   expires_at, pricing_engine_version, experiment_bucket, cache_hit }
function toQuoteView(quote) {
  return {
    subtotal: quote.subtotal_cents,
    discount: quote.discount_amount_cents,
    total: quote.total_cents,
    currency: quote.currency,
  };
}

function discountApplies(quote) {
  return quote.discount_amount_cents > 0;
}

// Shiplane: POST /v2/rates -> { rates: [{ carrier, service, amount_cents,
//   eta_days, ... }] }
function cheapestRate(rates) {
  if (!rates.length) return null;
  return rates.reduce((best, r) => (r.amount_cents < best.amount_cents ? r : best));
}

function etaLabel(rate) {
  return `${rate.eta_days} business days`;
}

module.exports = { toQuoteView, discountApplies, cheapestRate, etaLabel };
