'use strict';

const DAY_MS = 86400000;

function deadlineFor(request) {
  return new Date(Date.parse(request.receivedAt) + 30 * DAY_MS).toISOString().slice(0, 10);
}

function isOverdue(request, now) {
  const end = Date.parse(request.completedAt || now);
  return end > Date.parse(deadlineFor(request));
}

module.exports = { deadlineFor, isOverdue };
