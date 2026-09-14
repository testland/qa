const UNSUB_BASE = process.env.UNSUB_BASE ?? 'https://app.example.com/unsubscribe';

export function buildDigest(user, items) {
  const unsubUrl = `${UNSUB_BASE}?u=${user.unsubToken}`;
  const rows = items
    .map((i) => `<tr><td><a href="${i.url}">${i.title}</a></td><td>${i.count}</td></tr>`)
    .join('');

  return {
    from: 'digest@example.com',
    to: user.email,
    subject: `Your weekly Harbour digest — ${items.length} updates`,
    headers: {
      'List-Unsubscribe': `<${unsubUrl}>`,
    },
    html: `<html><body>
  <h1>Your weekly digest</h1>
  <table>${rows}</table>
  <p><a href="${unsubUrl}">Unsubscribe from these emails</a></p>
</body></html>`,
  };
}
