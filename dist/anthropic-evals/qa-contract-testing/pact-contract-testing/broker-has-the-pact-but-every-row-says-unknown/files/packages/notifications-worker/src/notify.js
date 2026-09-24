'use strict';

function pending(notifications) {
  return notifications.filter((n) => !n.sent);
}

function summarise(notifications) {
  return `${pending(notifications).length} unsent`;
}

module.exports = { pending, summarise };
