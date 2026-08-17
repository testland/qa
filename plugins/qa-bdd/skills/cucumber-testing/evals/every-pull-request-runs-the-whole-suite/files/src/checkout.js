function pay(cart, { card = null } = {}) {
  if (!card) return { confirmed: false, reason: 'Card required' };
  return { confirmed: true, chargedToCard: cart.total };
}

module.exports = { pay };
