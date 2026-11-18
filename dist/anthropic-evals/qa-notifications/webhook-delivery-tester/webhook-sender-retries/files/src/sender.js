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
