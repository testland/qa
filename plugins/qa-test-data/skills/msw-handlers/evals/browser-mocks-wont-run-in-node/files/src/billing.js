export async function loadOutstanding() {
  const res = await fetch('https://api.example.com/invoices');
  if (!res.ok) throw new Error(`invoice request failed: ${res.status}`);
  const invoices = await res.json();
  const unpaid = invoices.filter((invoice) => !invoice.paid);

  return {
    count: unpaid.length,
    total: unpaid.reduce((sum, invoice) => sum + invoice.amountCents, 0),
    overdue: unpaid.filter((invoice) => invoice.dueDays < 0).map((invoice) => invoice.id),
  };
}
