'use strict';

const FREE_SHIPPING_THRESHOLD_CENTS = 5000;
const BASE_CENTS = 599;
const PER_KG_CENTS = 120;
const FREIGHT_ABOVE_KG = 20;

function quote(order) {
  const free = order.subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS;
  const weightCents = Math.round(order.weightKg * PER_KG_CENTS);
  const heavy = order.weightKg > FREIGHT_ABOVE_KG;
  return {
    shippingCents: free ? 0 : BASE_CENTS + weightCents,
    free,
    carrier: heavy ? 'freight' : 'parcel',
    etaDays: heavy ? 5 : 2,
    currency: 'EUR',
  };
}

module.exports = { quote };
