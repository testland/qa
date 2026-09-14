import { users } from '../store.mjs';
import { checkCsrf } from '../security/csrf.mjs';

function requireSession(req, res) {
  if (req.session?.userId) return true;
  res.statusCode = 302;
  res.setHeader('location', `/login?next=${encodeURIComponent(req.url)}`);
  res.end();
  return false;
}

// GET /unsubscribe?u=<token> — shows the confirmation page
async function showPage(req, res) {
  if (!requireSession(req, res)) return;
  res.statusCode = 200;
  res.setHeader('content-type', 'text/html');
  res.end('<form method="post"><button name="confirm">Unsubscribe</button></form>');
}

// POST /unsubscribe?u=<token> — applies it
async function apply(req, res) {
  if (!requireSession(req, res)) return;
  if (!checkCsrf(req)) {
    res.statusCode = 403;
    return res.end('bad csrf token');
  }
  const token = new URL(req.url, 'http://x').searchParams.get('u');
  const user = users.byUnsubToken(token);
  if (!user) {
    res.statusCode = 404;
    return res.end('unknown token');
  }
  users.update(user.id, { subscribed: false });
  res.statusCode = 200;
  res.setHeader('content-type', 'text/html');
  res.end('<p>You have been unsubscribed. <a href="/settings">Change this</a></p>');
}

export const unsubscribeRoutes = [
  { method: 'GET', path: '/unsubscribe', handler: showPage },
  { method: 'POST', path: '/unsubscribe', handler: apply },
];
