function formatMoney(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function orderTotalCents(order) {
  return order.items.reduce(
    (sum, item) => sum + item.unitPriceCents * item.quantity,
    0,
  );
}

export function renderReceipt(order) {
  const lines = [`Receipt for ${order.customer.name}`];
  for (const item of order.items) {
    lines.push(
      `${item.name} x${item.quantity}  ${formatMoney(
        item.unitPriceCents * item.quantity,
      )}`,
    );
  }
  lines.push(`Total  ${formatMoney(orderTotalCents(order))}`);
  return lines;
}
