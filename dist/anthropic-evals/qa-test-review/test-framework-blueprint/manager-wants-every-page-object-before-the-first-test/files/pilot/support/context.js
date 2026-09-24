'use strict';

// The shared context every pilot test uses. This is the shape @tomas wants
// `helpers/` to have once the real suite starts.

const context = { signedIn: false, merchant: null, payouts: [] };

function signInAsOps() {
  context.signedIn = true;
  return context;
}

function seedMerchant(state) {
  context.merchant = { id: 'M-1', state, holds: [] };
  return context.merchant;
}

function seedPayout(amountCents) {
  const payout = { id: `P-${context.payouts.length + 1}`, amountCents, state: 'pending' };
  context.payouts.push(payout);
  return payout;
}

module.exports = { context, signInAsOps, seedMerchant, seedPayout };
