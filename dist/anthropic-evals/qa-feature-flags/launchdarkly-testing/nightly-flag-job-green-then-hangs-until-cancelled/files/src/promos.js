'use strict';

async function promoStack(client, account, promos) {
  const stacking = await client.variation('promo-stacking', account, false);
  return stacking ? promos : promos.slice(0, 1);
}

module.exports = { promoStack };
