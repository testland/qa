export function customerOrderReport(users, orders) {
  const byUser = new Map(
    users.map((user) => [
      user.id,
      { userId: user.id, name: user.name, orderCount: 0, totalCents: 0 },
    ]),
  );

  for (const order of orders) {
    const row = byUser.get(order.userId);
    if (!row) continue;
    row.orderCount += 1;
    row.totalCents += order.totalCents;
  }

  return [...byUser.values()];
}
