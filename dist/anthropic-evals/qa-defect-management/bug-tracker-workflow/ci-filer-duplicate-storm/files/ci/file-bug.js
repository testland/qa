'use strict';

const TOKEN = 'ghp_9Xk2LqR7vTn4Ba1ZcWm0PdYs5HjUf3Gt8Q';
const RETRIES = 3;

function title(failure) {
  return `CI failure: ${failure.location} ${failure.assertion}`;
}

// Sam, 2026-09-01: retry, then file anyway. Losing a failure is worse.
function lookup(client, failure) {
  for (let i = 0; i < RETRIES; i++) {
    try {
      const res = client.search(`is:open label:ci-failure "${title(failure)}"`, TOKEN);
      if (res.status === 200) return res.items;
    } catch (e) {
      // fall through to the next attempt
    }
  }
  return [];
}

function fileBug(client, failure) {
  const hits = lookup(client, failure);
  if (hits.length) {
    client.comment(hits[0].number, failure.message, TOKEN);
    return { action: 'commented', number: hits[0].number };
  }
  const created = client.create(title(failure), failure.message,
                                ['bug', 'auto-filed', 'ci-failure'], TOKEN);
  return { action: 'created', number: created.number };
}

module.exports = { fileBug, lookup, title };
