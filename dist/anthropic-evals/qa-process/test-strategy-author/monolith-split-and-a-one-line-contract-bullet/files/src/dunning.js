export function dueReminders(schedules, now) {
  return schedules.filter((s) => s.nextRun <= now);
}

export async function reminderFor(schedule, http) {
  const invoice = await http.get('invoicing', `/invoices/${schedule.invoiceId}`);
  const balance = await http.get('ledger', `/accounts/${invoice.accountId}/balance`);
  if (balance.amountCents >= 0) return null;
  return { invoiceId: invoice.id, accountId: invoice.accountId, dueCents: -balance.amountCents };
}
