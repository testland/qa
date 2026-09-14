export function lineTotal(line) {
  if (line.qty <= 0) return 0;
  const net = line.unitCents * line.qty;
  return net + Math.round(net * line.taxRate);
}

export function orderTotal(lines, shippingCents) {
  const goods = lines.reduce((sum, l) => sum + lineTotal(l), 0);
  const shipping = goods >= 5000 ? 0 : shippingCents;
  return goods + shipping;
}
