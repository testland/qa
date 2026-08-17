'use strict';

// Invoices are due on the customer's local calendar day.
function isDueToday(dueAtIso, now = new Date()) {
  const due = new Date(dueAtIso);
  return (
    due.getFullYear() === now.getFullYear() &&
    due.getMonth() === now.getMonth() &&
    due.getDate() === now.getDate()
  );
}

function dueLabel(dueAtIso, now = new Date()) {
  if (isDueToday(dueAtIso, now)) {
    return 'Due today';
  }
  return new Date(dueAtIso) < now ? 'Overdue' : 'Upcoming';
}

module.exports = { isDueToday, dueLabel };
