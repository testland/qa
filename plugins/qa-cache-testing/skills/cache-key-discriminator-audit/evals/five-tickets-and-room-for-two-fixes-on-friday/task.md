# Five tickets in the cache queue and room for two changes on Friday

## Problem Description

I own the read caches in the billing app and five things came in overnight.
Friday's release window has room for maybe two changes, so what I need this
morning is a triage: which of these are the same problem, which are mine at
all, and which one goes first.

Three of them read like staleness to me and my instinct is to drop the TTLs.
The last time we did that the Redis box went to 90% CPU on a Monday morning
and we spent a week putting it back, so I want a reason before I touch a TTL
and I want to know what the reason actually is in each case.

`tickets/inbox-2026-09-11.md` has the five as they were reported. `src/` has
the code behind each one. Everything in `src/` goes through the one Redis
instance and every organisation on the platform is on it.

Where a ticket is not mine, tell me whose it is and why. I have to route it
today either way, and "not a cache problem" on its own will get it bounced
straight back to me by lunchtime.

One of these has been open since Tuesday with the account team asking whether
it is a pricing change. I would like an answer on that one specifically.

## Output Specification

1. Write `docs/triage-2026-09-11.md`. Start with a table, one row per ticket:
   the ticket id, whether it belongs to you, what the response body actually
   varies on, how bad it is, and where it goes if it is not yours. Then one
   section per ticket that is yours, with the fix.
2. Change the code behind every ticket that is yours, and order them in the
   triage document so I know which ones go in Friday's window and which one
   waits. Leave the rest of `src/` exactly as it is.
3. Add `src/keyRegression.test.js`, one test per change you make, each driving
   two different callers - or the same caller on two different days - through
   one shared cache instance.
4. `npm test` must pass. `src/cache.test.js` is shipped and passing; do not
   edit or delete anything in it.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "billing-app-caches",
  "version": "12.7.3",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: tickets/inbox-2026-09-11.md ===============
# Cache queue - overnight 2026-09-10 into 2026-09-11

## T-9041 - Invoice totals shown in the wrong currency

Reported 2026-09-10 16:40 by Ana Costa (acme, member 2).

Ana's display currency is EUR. She opened the August invoice page and the
total read `GBP 543.00`. Her colleague Priya Raman (acme, member 1, display
currency GBP) had opened the same page about five minutes earlier and saw
`GBP 543.00`, which is right for Priya.

Ana reloaded twenty minutes later and got `EUR 635.31`, which is right for
Ana. Both of them are on the same organisation and the same billing period.

## T-9042 - Seat count behind after an upgrade

Reported 2026-09-10 09:22 by the acme account manager.

acme bought 50 extra seats at 09:14. The members page kept showing a limit of
250 until about 09:18, then showed 300 with no further action. Customer had
already emailed support by then. Third time this has happened this quarter.

## T-9043 - Trial banner has said the same thing for three days

Reported 2026-09-10 11:05 by globex.

The banner at the top of the app says "Your trial ends in 13 days". It said 13
days on Monday, on Tuesday and again on Wednesday. Customer wants to know
which day is right because they are budgeting around the renewal date.

## T-9044 - Free account has an Exports tab

Reported 2026-09-08 13:50 by support, escalated 2026-09-09.

A globex admin (free plan) has an "Exports" item and an "Audit log" item in
the left nav. Clicking either returns 403. globex has asked twice whether
Exports has been made available on free plans and whether they can start
using it. Account team wants to know what to tell them - is this a pricing
change we shipped? Nobody on the pricing side recognises it.

Not reproducible on demand. The globex admin sees it some sessions and not
others.

## T-9045 - Removed member comes back in the list

Reported 2026-09-10 22:14 by an on-call engineer.

Removing a member from an organisation sometimes leaves them in the members
list for up to ten minutes afterwards. Only happens on the two organisations
with heavy concurrent traffic; never reproduces on a quiet tenant. The
engineer's note says "looks like a race between the delete and something that
repopulates".

=============== FILE: src/cache.js ===============
'use strict';

// The single Redis instance behind the billing app. Shared by every
// organisation on the platform.
function createCache(clock = () => Date.now()) {
  const store = new Map();
  return {
    get(key) {
      const entry = store.get(key);
      if (!entry) return null;
      if (entry.expiresAt <= clock()) {
        store.delete(key);
        return null;
      }
      return JSON.parse(entry.value);
    },
    set(key, value, ttlSeconds) {
      store.set(key, {
        value: JSON.stringify(value),
        expiresAt: clock() + ttlSeconds * 1000,
      });
    },
    del(key) {
      store.delete(key);
    },
    keys: () => [...store.keys()],
    size: () => store.size,
  };
}

module.exports = { createCache };

=============== FILE: src/db.js ===============
'use strict';

const orgs = {
  acme: { plan: 'business', seatsUsed: 214, seatLimit: 250, trialEndsAt: '2026-09-25T00:00:00Z' },
  globex: { plan: 'free', seatsUsed: 8, seatLimit: 10, trialEndsAt: '2026-09-25T00:00:00Z' },
};

const invoiceRows = {
  'acme:2026-08': [{ cents: 41800 }, { cents: 12500 }],
  'globex:2026-08': [{ cents: 9900 }],
};

let members = [
  { tenantId: 'acme', memberNo: 1, name: 'Priya Raman', displayCurrency: 'GBP', locale: 'en-GB', role: 'admin' },
  { tenantId: 'acme', memberNo: 2, name: 'Ana Costa', displayCurrency: 'EUR', locale: 'en-GB', role: 'member' },
  { tenantId: 'globex', memberNo: 1, name: 'Hana Okafor', displayCurrency: 'USD', locale: 'en-GB', role: 'admin' },
];

module.exports = {
  org: (tenantId) => ({ ...orgs[tenantId] }),
  setSeatLimit: (tenantId, limit) => {
    orgs[tenantId].seatLimit = limit;
  },
  invoiceRows: (tenantId, period) => [...(invoiceRows[`${tenantId}:${period}`] ?? [])],
  members: (tenantId) => members.filter((m) => m.tenantId === tenantId),
  removeMember: (tenantId, memberNo) => {
    members = members.filter((m) => !(m.tenantId === tenantId && m.memberNo === memberNo));
  },
  sessionFor: (tenantId, memberNo) => {
    const m = members.find((x) => x.tenantId === tenantId && x.memberNo === memberNo);
    return {
      tenantId: m.tenantId,
      memberNo: m.memberNo,
      displayCurrency: m.displayCurrency,
      locale: m.locale,
      role: m.role,
    };
  },
};

=============== FILE: src/invoiceTotals.js ===============
'use strict';

const db = require('./db');

const RATE_FROM_GBP = { GBP: 1, EUR: 1.17, USD: 1.27 };

function invoiceTotalsKey(tenantId, period) {
  return `invoice-totals:${tenantId}:${period}`;
}

function loadInvoiceTotals(cache, session, period) {
  const key = invoiceTotalsKey(session.tenantId, period);
  const hit = cache.get(key);
  if (hit) return hit;

  const rows = db.invoiceRows(session.tenantId, period);
  const gbpCents = rows.reduce((sum, row) => sum + row.cents, 0);
  const cents = Math.round(gbpCents * RATE_FROM_GBP[session.displayCurrency]);
  const totals = {
    currency: session.displayCurrency,
    amount: `${session.displayCurrency} ${(cents / 100).toFixed(2)}`,
    lines: rows.length,
  };
  cache.set(key, totals, 900);
  return totals;
}

module.exports = { invoiceTotalsKey, loadInvoiceTotals };

=============== FILE: src/seatCount.js ===============
'use strict';

const db = require('./db');

function seatCountKey(tenantId) {
  return `seats:${tenantId}`;
}

function loadSeatCount(cache, session) {
  const key = seatCountKey(session.tenantId);
  const hit = cache.get(key);
  if (hit) return hit;

  const org = db.org(session.tenantId);
  const value = { used: org.seatsUsed, limit: org.seatLimit };
  cache.set(key, value, 300);
  return value;
}

module.exports = { seatCountKey, loadSeatCount };

=============== FILE: src/trialBanner.js ===============
'use strict';

const db = require('./db');

const DAY_MS = 86400000;

function trialBannerKey(tenantId) {
  return `trial-banner:${tenantId}`;
}

// The trial end date does not move, so this is held for a week.
function loadTrialBanner(cache, session, now) {
  const key = trialBannerKey(session.tenantId);
  const hit = cache.get(key);
  if (hit) return hit;

  const endsAt = Date.parse(db.org(session.tenantId).trialEndsAt);
  const daysLeft = Math.max(0, Math.ceil((endsAt - now) / DAY_MS));
  const banner = { daysLeft, text: `Your trial ends in ${daysLeft} days` };
  cache.set(key, banner, 604800);
  return banner;
}

module.exports = { trialBannerKey, loadTrialBanner };

=============== FILE: src/appShell.js ===============
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

=============== FILE: src/memberList.js ===============
'use strict';

const db = require('./db');

function memberListKey(tenantId) {
  return `members:${tenantId}`;
}

function loadMemberList(cache, tenantId) {
  const key = memberListKey(tenantId);
  const hit = cache.get(key);
  if (hit) return hit;

  const list = db.members(tenantId).map((m) => ({ memberNo: m.memberNo, name: m.name }));
  cache.set(key, list, 600);
  return list;
}

function removeMember(cache, tenantId, memberNo) {
  cache.del(memberListKey(tenantId));
  db.removeMember(tenantId, memberNo);
}

module.exports = { memberListKey, loadMemberList, removeMember };

=============== FILE: src/cache.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { createCache } = require('./cache');
const db = require('./db');
const { loadSeatCount } = require('./seatCount');
const { loadMemberList } = require('./memberList');
const { loadInvoiceTotals } = require('./invoiceTotals');

test('a value survives a round trip', () => {
  const cache = createCache();
  cache.set('k', { a: 1 }, 60);
  assert.deepEqual(cache.get('k'), { a: 1 });
});

test('an expired entry is gone', () => {
  let now = 0;
  const cache = createCache(() => now);
  cache.set('k', { a: 1 }, 60);
  now = 60_001;
  assert.equal(cache.get('k'), null);
});

test('del removes an entry', () => {
  const cache = createCache();
  cache.set('k', { a: 1 }, 60);
  cache.del('k');
  assert.equal(cache.get('k'), null);
});

test('the seat count is served from the cache on the second call', () => {
  const cache = createCache();
  const session = db.sessionFor('acme', 1);
  assert.deepEqual(loadSeatCount(cache, session), { used: 214, limit: 250 });
  assert.equal(cache.size(), 1);
  assert.deepEqual(loadSeatCount(cache, session), { used: 214, limit: 250 });
  assert.equal(cache.size(), 1);
});

test('the member list comes back for the organisation that asked', () => {
  const cache = createCache();
  assert.equal(loadMemberList(cache, 'globex').length, 1);
  assert.equal(loadMemberList(cache, 'acme').length, 2);
});

test('invoice totals count the lines in the period', () => {
  const cache = createCache();
  const totals = loadInvoiceTotals(cache, db.sessionFor('acme', 1), '2026-08');
  assert.equal(totals.lines, 2);
  assert.equal(totals.amount, 'GBP 543.00');
});
