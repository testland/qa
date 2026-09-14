import { users } from './store.mjs';
import { createTransport } from './transport.mjs';

const transport = createTransport({
  host: process.env.SMTP_HOST ?? 'localhost',
  port: Number(process.env.SMTP_PORT ?? 1025),
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
