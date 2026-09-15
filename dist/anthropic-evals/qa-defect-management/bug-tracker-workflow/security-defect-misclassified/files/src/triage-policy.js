'use strict';

const FROM_PRIORITY = {
  Highest: '1 - Critical',
  High: '2 - High',
  Medium: '3 - Medium',
  Low: '5 - Cosmetic',
};

function normalize(ticket) {
  const derived = FROM_PRIORITY[ticket.priority];
  if (!derived) return { ...ticket };
  if (!ticket.severity) return { ...ticket, severity: derived, severity_source: 'derived' };
  if (ticket.severity !== derived) return { ...ticket, severity: derived, severity_source: 'aligned' };
  return { ...ticket };
}

module.exports = { normalize, FROM_PRIORITY };
