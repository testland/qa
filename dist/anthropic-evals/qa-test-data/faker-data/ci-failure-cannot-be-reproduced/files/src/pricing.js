export function cartTotalCents(cart) {
  const gross = cart.items.reduce(
    (sum, item) => sum + item.unitPriceCents * item.quantity,
    0,
  );
  if (cart.customer.tier === 'gold') {
    return gross - Math.round(gross * 0.1);
  }
  return gross;
}
