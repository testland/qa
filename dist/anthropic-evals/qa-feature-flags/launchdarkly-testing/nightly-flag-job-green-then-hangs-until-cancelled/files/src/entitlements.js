'use strict';

async function resolveCheckoutMode(client, user) {
  const v2 = await client.variation('checkout-v2', user, false);
  if (!v2) return 'legacy';
  const express = await client.variation('express-lane', user, false);
  return express ? 'express' : 'standard';
}

module.exports = { resolveCheckoutMode };
