'use strict';

const { route } = require('./router');

const STATEMENTS = {
  'acct-4180': {
    holder: 'Priya Raman',
    iban: 'GB29 NWBK 6016 1331 9268 19',
    closingBalanceCents: 812400,
  },
  'acct-7742': {
    holder: 'Hana Okafor',
    iban: 'GB94 BARC 1020 1530 0934 59',
    closingBalanceCents: 19950,
  },
};

const MESSAGES = {
  'acct-4180': ['Your card ending 4411 was used at Tesco', 'Standing order to Flat 2b sent'],
  'acct-7742': ['Overdraft interest applied'],
};

const ASSETS = {
  '/assets/app.css': { type: 'text/css', body: 'body{margin:0}' },
  '/assets/app.js': { type: 'application/javascript', body: 'console.log(1)' },
  '/assets/logo.png': { type: 'image/png', body: 'PNG-BYTES' },
};

function notFound() {
  return {
    status: 404,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
    body: '<h1>Not found</h1>',
  };
}

function origin(req) {
  const name = route(req.url);
  const accountId = req.session && req.session.accountId;

  if (name === 'statement') {
    const s = STATEMENTS[accountId];
    if (!s) return notFound();
    return {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'private, no-store',
      },
      body: `<h1>Statement for ${s.holder}</h1><p>${s.iban}</p><p>${(s.closingBalanceCents / 100).toFixed(2)}</p>`,
    };
  }

  if (name === 'messages') {
    const m = MESSAGES[accountId];
    if (!m) return notFound();
    return {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
      body: `<ul>${m.map((line) => `<li>${line}</li>`).join('')}</ul>`,
    };
  }

  if (name === 'asset') {
    const a = ASSETS[req.url];
    if (!a) return notFound();
    return {
      status: 200,
      headers: { 'content-type': a.type, 'cache-control': 'public, max-age=300' },
      body: a.body,
    };
  }

  if (name === 'marketing') {
    return {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=300' },
      body: '<h1>Open an account</h1>',
    };
  }

  return notFound();
}

module.exports = { origin, STATEMENTS, MESSAGES };
