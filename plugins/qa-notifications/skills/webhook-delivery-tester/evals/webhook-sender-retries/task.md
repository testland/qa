# Make our webhook sender follow Standard Webhooks

## Problem Description

Fix our webhook sender (`src/sender.js`, partner complaints in `docs/partner-feedback.md`) so it follows Standard Webhooks, and write tests for it.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: src/sender.js ===============
const crypto = require('crypto');

async function deliver(endpoint, event) {
  const body = JSON.stringify(event.payload);
  const timestamp = Math.floor(event.createdAt.getTime() / 1000);   // signed once with the event time
  const signature = sign(endpoint.secret, crypto.randomUUID(), timestamp, body);
  for (let attempt = 1; attempt <= 3; attempt++) {
    const id = crypto.randomUUID();                                   // new id per attempt
    const res = await fetch(endpoint.url, {
      method: 'POST', body, redirect: 'follow',
      headers: { 'content-type': 'application/json', 'webhook-id': id,
                 'webhook-timestamp': String(timestamp), 'webhook-signature': signature },
    });
    if (res.status === 200) return 'delivered';
    await new Promise((r) => setTimeout(r, 1000));
  }
  return 'failed';
}

function sign(secret, id, ts, body) {
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  return 'v1,' + crypto.createHmac('sha256', key).update(`${id}.${ts}.${body}`).digest('base64');
}
module.exports = { deliver };

=============== FILE: docs/partner-feedback.md ===============
- Partner A: we receive the same event several times with different ids, so our dedupe fails.
- Partner B: retries fail our signature check, and some events are rejected as too old.
- Partner C: our endpoint answers 202 Accepted and you still retry.
- Partner D: during our 2-hour outage you gave up after 3 seconds; events were lost.
