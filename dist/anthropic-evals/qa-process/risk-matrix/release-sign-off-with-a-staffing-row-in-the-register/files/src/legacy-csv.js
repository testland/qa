export function toCsv(rows) {
  const header = 'seller_id,amount_cents';
  const body = rows.map((r) => `${r.sellerId},${r.amountCents}`).join('\n');
  return `${header}\n${body}\n`;
}
