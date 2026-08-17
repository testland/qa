function pay(cart, { giftCard = 0, card = null } = {}) {
  const fromGiftCard = Math.min(giftCard, cart.total);
  const fromCard = Number((cart.total - fromGiftCard).toFixed(2));
  if (fromCard > 0 && !card) {
    return { confirmed: false, reason: 'Card required' };
  }
  return { confirmed: true, chargedToCard: fromCard, chargedToGiftCard: fromGiftCard };
}

module.exports = { pay };
