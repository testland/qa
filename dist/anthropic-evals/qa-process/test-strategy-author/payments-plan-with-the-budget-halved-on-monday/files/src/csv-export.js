const COLUMNS = ['payout_id', 'seller_id', 'amount_cents', 'currency', 'settled_at'];

function escape(value) {
  const s = String(value ?? '');
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function toCsv(rows) {
  const lines = [COLUMNS.join(',')];
  for (const row of rows) lines.push(COLUMNS.map((c) => escape(row[c])).join(','));
  return lines.join('\n') + '\n';
}
