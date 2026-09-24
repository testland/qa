'use strict';

const TERMINAL = 'Closed';

function decide(ticket) {
  if (ticket.state === TERMINAL) return { action: 'none', why: 'already closed' };
  if (!ticket.pr_merged) return { action: 'none', why: 'no merged fix' };
  if (ticket.deploy_status === 'succeeded') {
    return { action: 'close', why: `deploy ${ticket.deploy_id} succeeded` };
  }
  return { action: 'none', why: 'deploy not green' };
}

// Nightly. Whatever the query returns gets decided and applied in the same pass.
function run(tickets, apply) {
  const decisions = tickets.map(decide);
  decisions.forEach((d, i) => {
    if (d.action === 'close') apply(tickets[i].key, TERMINAL, d.why);
  });
  return decisions;
}

module.exports = { decide, run, TERMINAL };
