'use strict';

function dueDateFor(createdAtIso, offsetMinutes, days) {
  const createdMs = new Date(createdAtIso).getTime();
  const local = new Date(createdMs + offsetMinutes * 60000);
  const due = new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + days),
  );
  return due.toISOString().slice(0, 10);
}

function formatDueLabel(isoDate) {
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

module.exports = { dueDateFor, formatDueLabel };
