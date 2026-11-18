# Billing webhooks sometimes apply twice or leave old state

## Problem Description

Our billing webhook receiver (`src/receiver.js`) sometimes applies an event twice and sometimes leaves subscriptions in an old state (`docs/incidents.md`). Fix it and add tests.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: src/receiver.js ===============
app.post('/webhooks/billing', express.json(), async (req, res) => {
  const event = req.body;               // { id, type, created, data: { subscription } }
  if (!verifySignature(req)) return res.sendStatus(400);
  const seen = await db.query('SELECT 1 FROM processed_events WHERE id = $1', [event.id]);
  if (seen.rowCount) return res.sendStatus(200);
  await applySubscriptionChange(event.data.subscription);   // writes status, plan; calls the CRM (~20-40 s)
  await db.query('INSERT INTO processed_events (id) VALUES ($1)', [event.id]);
  res.sendStatus(200);
});

=============== FILE: docs/incidents.md ===============
- The provider times out after 15 s and retries; customers got two welcome emails for one event.
- A customer's plan shows "trial" although they upgraded: subscription.updated (plan=pro) arrived first,
  then a delayed subscription.created (plan=trial) overwrote it.
- verifySignature recomputes the HMAC over JSON.stringify(req.body).
