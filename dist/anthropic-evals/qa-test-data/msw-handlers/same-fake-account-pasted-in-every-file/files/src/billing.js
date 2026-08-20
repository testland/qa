export async function loadOutstandingTotal() {
  const res = await fetch('https://api.example.com/invoices');
  if (!res.ok) throw new Error(`invoice request failed: ${res.status}`);
  const invoices = await res.json();
  return invoices.filter((invoice) => !invoice.paid).reduce((sum, i) => sum + i.amount, 0);
}
