'use strict';

const crypto = require('node:crypto');

const SECRET = process.env.PARCELO_SECRET || 'whsec_cGFyY2Vsby1zYW5kYm94LXNoYXJlZC1zZWNyZXQh';

const shipments = new Map();

function verifySignature(rawBody, headers) {
  const parsed = JSON.parse(rawBody);
  const canonical = JSON.stringify(parsed);

  const key = Buffer.from(SECRET.replace(/^whsec_/, ''), 'base64');
  const signed =
    headers['parcelo-delivery-id'] + '.' + headers['parcelo-timestamp'] + '.' + canonical;
  const expected = crypto.createHmac('sha256', key).update(signed).digest('base64');

  const provided = String(headers['parcelo-signature'] || '').replace(/^v1,/, '');
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function applyUpdate(event) {
  const current = shipments.get(event.shipment_id) || { history: [] };

  switch (event.status) {
    case 'created':
      current.state = 'awaiting_pickup';
      break;
    case 'shipped':
      current.state = 'in_transit';
      break;
    case 'delivered':
      current.state = 'delivered';
      break;
    case 'failed':
      current.state = 'needs_attention';
      break;
    default:
      throw new Error('unknown Parcelo status: ' + event.status);
  }

  current.tracking = event.tracking_number;
  current.history.push(event.event_time);
  shipments.set(event.shipment_id, current);
}

function handle(rawBody, headers) {
  if (!verifySignature(rawBody, headers)) {
    return { status: 400 };
  }

  const event = JSON.parse(rawBody);

  // Ack inside Parcelo's 3s budget; the warehouse lookup in applyUpdate is slow.
  queueMicrotask(() => {
    try {
      applyUpdate(event);
    } catch (err) {
      console.error('[parcelo] dropped event', event.shipment_id, err.message);
    }
  });

  return { status: 200 };
}

module.exports = { handle, verifySignature, applyUpdate, shipments, SECRET };
