'use strict';

async function seatTier(client, account) {
  const v2 = await client.variation('seat-tier-v2', account, false);
  if (!v2) return 'legacy';
  const bulk = await client.variation('bulk-seat-discount', account, false);
  return bulk ? 'v2-bulk' : 'v2-flat';
}

async function priceBook(client, account) {
  return client.variation('price-book-region', account, 'global');
}

module.exports = { seatTier, priceBook };
