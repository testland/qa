'use strict';

const WALLETS = new Map();

function reset() {
  WALLETS.clear();
  WALLETS.set('w_1', { id: 'w_1', balanceCents: 1000 });
}

reset();

function withdraw(walletId, cents) {
  const wallet = WALLETS.get(walletId);
  if (!wallet) {
    return { ok: false, code: 'NOT_FOUND' };
  }
  wallet.balanceCents -= cents;
  return { ok: true, balanceCents: wallet.balanceCents };
}

function getWalletView(walletId) {
  const wallet = WALLETS.get(walletId);
  if (!wallet) {
    return null;
  }
  return { id: wallet.id, balanceCents: Math.max(0, wallet.balanceCents) };
}

function readRow(walletId) {
  return WALLETS.get(walletId) || null;
}

module.exports = { withdraw, getWalletView, readRow, reset };
