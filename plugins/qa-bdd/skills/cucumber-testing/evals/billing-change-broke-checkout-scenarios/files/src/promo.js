const CODES = { WELCOME10: 0.1 };

function applyPromo(cart, code) {
  const rate = CODES[code];
  if (rate === undefined) return { total: cart.total, message: 'Code not found' };
  return { total: Number((cart.total * (1 - rate)).toFixed(2)), message: 'Applied' };
}

module.exports = { applyPromo };
