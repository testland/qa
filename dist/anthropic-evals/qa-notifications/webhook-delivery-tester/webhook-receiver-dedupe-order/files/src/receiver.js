app.post('/webhooks/billing', express.json(), async (req, res) => {
  const event = req.body;               // { id, type, created, data: { subscription } }
  if (!verifySignature(req)) return res.sendStatus(400);
  const seen = await db.query('SELECT 1 FROM processed_events WHERE id = $1', [event.id]);
  if (seen.rowCount) return res.sendStatus(200);
  await applySubscriptionChange(event.data.subscription);   // writes status, plan; calls the CRM (~20-40 s)
  await db.query('INSERT INTO processed_events (id) VALUES ($1)', [event.id]);
  res.sendStatus(200);
});
