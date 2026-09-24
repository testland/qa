'use strict';

const db = require('./db');

const PAID_PLANS = new Set(['business', 'enterprise']);

function appShellKey(locale) {
  return `shell:${locale}`;
}

function loadAppShell(cache, session) {
  const key = appShellKey(session.locale);
  const hit = cache.get(key);
  if (hit) return hit;

  const nav = ['Home', 'Invoices', 'Members'];
  if (PAID_PLANS.has(db.org(session.tenantId).plan)) {
    nav.push('Exports', 'Audit log');
  }
  const shell = { locale: session.locale, nav };
  cache.set(key, shell, 3600);
  return shell;
}

module.exports = { appShellKey, loadAppShell };
