import { users } from './store.mjs';
import { buildDigest } from './templates/digest.mjs';
import { createTransport } from './transport.mjs';

const transport = createTransport({
  host: process.env.SMTP_HOST ?? 'localhost',
  port: Number(process.env.SMTP_PORT ?? 1025),
  // the client signs the message before handing it to the transport, so every
  // message we emit carries a DKIM-Signature header
  dkim: {
    domainName: 'example.com',
    keySelector: 'harbour2026',
    privateKey: process.env.DKIM_PRIVATE_KEY ?? '-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----',
  },
});

export async function send(message) {
  const user = users.byEmail(message.to);
  return transport.send({
    from: message.from,
    to: message.to,
    subject: message.subject,
    html: message.html,
    text: message.text,
    headers: message.headers,
    envelope: { from: 'bounces@example.com', to: message.to },
    userId: user?.id,
  });
}

export async function sendDigest(user, items = []) {
  return send(buildDigest(user, items));
}
