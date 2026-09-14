# External review gave us a Friday deadline on three Redis keys

## Problem Description

We had an external review of the members API last week and one line of it has
turned into a Friday deadline for me. Finding R-7 says none of the three Redis
keys in this service carries the organisation identifier and recommends we
prefix all three. The note is in `docs/review-note-2026-09-04.md` and my written
response is due 2026-09-12.

Honestly I am inclined to just do all three and be done with it. It is three
lines, the reviewer is not going to argue with us for doing more than they
asked, and I have a board pack to write. But I have to put my name on the
response and I do not want to be the person who typed "done" next to something
they had not read, so I want each of the three looked at before it goes out.

`db/schema.sql` is the real table layout and `db/seed.js` is a trimmed copy of
what is actually in there. The three services are in `src/`. They share one
Redis instance and every organisation on the platform is on it -
`ops/redis-2026-09-10.md` is last night's report off that box.

Write the response so I can paste it in.

## Output Specification

1. Write `docs/key-review-2026-09-12.md`: one entry per cached response, each
   with a verdict and the reason for it.
2. Change only the services whose key is actually wrong. Leave the others
   exactly as they are.
3. Add `src/keyCollision.test.js`. For each change you make, a test that drives
   two different callers through one shared cache instance and asserts they do
   not receive each other's body.
4. `npm test` must pass. `src/cache.test.js` is shipped and passing; do not edit
   or delete anything in it.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "members-api",
  "version": "8.2.0",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: db/schema.sql ===============
CREATE TABLE people (
  person_id     CHAR(36)     NOT NULL,
  display_name  VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL,
  PRIMARY KEY (person_id)
);

CREATE TABLE members (
  tenant_id  VARCHAR(64)  NOT NULL,
  member_no  INT          NOT NULL,
  person_id  CHAR(36)     NOT NULL,
  role       VARCHAR(32)  NOT NULL,
  PRIMARY KEY (tenant_id, member_no),
  KEY idx_members_person (person_id),
  CONSTRAINT fk_members_person FOREIGN KEY (person_id) REFERENCES people (person_id)
);

CREATE TABLE preferences (
  person_id  CHAR(36)     NOT NULL,
  theme      VARCHAR(32)  NOT NULL,
  digest     VARCHAR(32)  NOT NULL,
  timezone   VARCHAR(64)  NOT NULL,
  PRIMARY KEY (person_id)
);

CREATE TABLE orgs (
  tenant_id              VARCHAR(64)  NOT NULL,
  org_name               VARCHAR(255) NOT NULL,
  region                 VARCHAR(32)  NOT NULL,
  billing_contact_email  VARCHAR(255) NOT NULL,
  seat_limit             INT          NOT NULL,
  pending_invoice_cents  INT          NOT NULL,
  PRIMARY KEY (tenant_id)
);

=============== FILE: db/seed.js ===============
'use strict';

const people = [
  { personId: '0a1f2c3d-4e5f-4a6b-8c9d-0e1f2a3b4c5d', displayName: 'Priya Raman', email: 'priya@acme.example' },
  { personId: '1b2c3d4e-5f60-4b7c-9d0e-1f2a3b4c5d6e', displayName: 'Tom Ilves', email: 'tom@ilves.example' },
  { personId: '2c3d4e5f-6071-4c8d-ae1f-2a3b4c5d6e7f', displayName: 'Hana Okafor', email: 'hana@globex.example' },
  { personId: '3d4e5f60-7182-4d9e-bf2a-3b4c5d6e7f80', displayName: 'Ben Larsen', email: 'ben@globex.example' },
];

const members = [
  { tenantId: 'acme', memberNo: 1, personId: '0a1f2c3d-4e5f-4a6b-8c9d-0e1f2a3b4c5d', role: 'admin' },
  { tenantId: 'acme', memberNo: 2, personId: '1b2c3d4e-5f60-4b7c-9d0e-1f2a3b4c5d6e', role: 'member' },
  { tenantId: 'globex', memberNo: 1, personId: '2c3d4e5f-6071-4c8d-ae1f-2a3b4c5d6e7f', role: 'admin' },
  { tenantId: 'globex', memberNo: 2, personId: '3d4e5f60-7182-4d9e-bf2a-3b4c5d6e7f80', role: 'member' },
  { tenantId: 'globex', memberNo: 3, personId: '1b2c3d4e-5f60-4b7c-9d0e-1f2a3b4c5d6e', role: 'member' },
];

const preferences = [
  { personId: '0a1f2c3d-4e5f-4a6b-8c9d-0e1f2a3b4c5d', theme: 'dark', digest: 'daily', timezone: 'Europe/London' },
  { personId: '1b2c3d4e-5f60-4b7c-9d0e-1f2a3b4c5d6e', theme: 'light', digest: 'weekly', timezone: 'Europe/Tallinn' },
  { personId: '2c3d4e5f-6071-4c8d-ae1f-2a3b4c5d6e7f', theme: 'light', digest: 'off', timezone: 'Africa/Lagos' },
  { personId: '3d4e5f60-7182-4d9e-bf2a-3b4c5d6e7f80', theme: 'dark', digest: 'daily', timezone: 'Europe/Oslo' },
];

const orgs = [
  {
    tenantId: 'acme',
    orgName: 'Acme Supply Co',
    region: 'eu-west',
    billingContactEmail: 'ap@acme.example',
    seatLimit: 250,
    pendingInvoiceCents: 418000,
  },
  {
    tenantId: 'globex',
    orgName: 'Globex Industrial',
    region: 'us-east',
    billingContactEmail: 'finance@globex.example',
    seatLimit: 40,
    pendingInvoiceCents: 0,
  },
];

module.exports = { people, members, preferences, orgs };

=============== FILE: src/cache.js ===============
'use strict';

// The single Redis instance in front of the members API. Every organisation
// on the platform reads and writes through this one store.
function createCache() {
  const store = new Map();
  return {
    get: (key) => (store.has(key) ? JSON.parse(store.get(key)) : null),
    set: (key, value) => {
      store.set(key, JSON.stringify(value));
    },
    del: (key) => store.delete(key),
    keys: () => [...store.keys()],
    size: () => store.size,
  };
}

module.exports = { createCache };

=============== FILE: src/profileService.js ===============
'use strict';

const { members, people } = require('../db/seed');

function profileKey(memberNo) {
  return `profile:${memberNo}`;
}

function loadProfile(cache, session) {
  const key = profileKey(session.memberNo);
  const hit = cache.get(key);
  if (hit) return hit;

  const member = members.find(
    (m) => m.tenantId === session.tenantId && m.memberNo === session.memberNo,
  );
  const person = people.find((p) => p.personId === member.personId);
  const profile = { displayName: person.displayName, email: person.email, org: member.tenantId };
  cache.set(key, profile);
  return profile;
}

module.exports = { profileKey, loadProfile };

=============== FILE: src/preferenceService.js ===============
'use strict';

const { preferences } = require('../db/seed');

function preferenceKey(personId) {
  return `prefs:${personId}`;
}

function loadPreferences(cache, session) {
  const key = preferenceKey(session.personId);
  const hit = cache.get(key);
  if (hit) return hit;

  const row = preferences.find((p) => p.personId === session.personId);
  const prefs = { theme: row.theme, digest: row.digest, timezone: row.timezone };
  cache.set(key, prefs);
  return prefs;
}

function savePreferences(cache, session, patch) {
  const row = preferences.find((p) => p.personId === session.personId);
  Object.assign(row, patch);
  cache.del(preferenceKey(session.personId));
}

module.exports = { preferenceKey, loadPreferences, savePreferences };

=============== FILE: src/orgSettingsService.js ===============
'use strict';

const { orgs } = require('../db/seed');

function orgSettingsKey(tenantId) {
  return `org:${tenantId}`;
}

function loadOrgSettings(cache, session) {
  const key = orgSettingsKey(session.tenantId);
  const hit = cache.get(key);
  if (hit) return hit;

  const org = orgs.find((o) => o.tenantId === session.tenantId);
  const settings = { orgName: org.orgName, region: org.region };
  if (session.role === 'admin') {
    settings.billingContactEmail = org.billingContactEmail;
    settings.seatLimit = org.seatLimit;
    settings.pendingInvoiceCents = org.pendingInvoiceCents;
  }
  cache.set(key, settings);
  return settings;
}

module.exports = { orgSettingsKey, loadOrgSettings };

=============== FILE: src/sessions.js ===============
'use strict';

const { members } = require('../db/seed');

// Built by the auth middleware from the session cookie on every request.
function sessionFor(tenantId, memberNo) {
  const row = members.find((m) => m.tenantId === tenantId && m.memberNo === memberNo);
  return {
    tenantId: row.tenantId,
    memberNo: row.memberNo,
    personId: row.personId,
    role: row.role,
  };
}

module.exports = { sessionFor };

=============== FILE: src/cache.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { createCache } = require('./cache');
const { sessionFor } = require('./sessions');
const { loadProfile } = require('./profileService');
const { loadPreferences } = require('./preferenceService');
const { loadOrgSettings } = require('./orgSettingsService');

test('a value survives a round trip', () => {
  const cache = createCache();
  cache.set('k', { a: 1 });
  assert.deepEqual(cache.get('k'), { a: 1 });
});

test('a miss returns null', () => {
  assert.equal(createCache().get('nope'), null);
});

test('a profile is served from the cache on the second call', () => {
  const cache = createCache();
  const session = sessionFor('acme', 2);
  assert.equal(loadProfile(cache, session).displayName, 'Tom Ilves');
  assert.equal(cache.size(), 1);
  assert.equal(loadProfile(cache, session).displayName, 'Tom Ilves');
  assert.equal(cache.size(), 1);
});

test('someone who belongs to two organisations has one set of preferences', () => {
  const cache = createCache();
  const viaAcme = loadPreferences(cache, sessionFor('acme', 2));
  const viaGlobex = loadPreferences(cache, sessionFor('globex', 3));
  assert.equal(viaAcme.timezone, 'Europe/Tallinn');
  assert.deepEqual(viaGlobex, viaAcme);
  assert.equal(cache.size(), 1);
});

test('an admin sees the billing fields on org settings', () => {
  const cache = createCache();
  const settings = loadOrgSettings(cache, sessionFor('globex', 1));
  assert.equal(settings.orgName, 'Globex Industrial');
  assert.equal(settings.seatLimit, 40);
});

=============== FILE: docs/review-note-2026-09-04.md ===============
# External review - members API, extract

Reviewer: Halden Assurance, engagement 2026-09-01 to 2026-09-03.
Scope: read-only checkout at `9f21c04`. No database or staging access granted.

## Finding R-7 (rated High)

None of the three Redis keys in the members API carries the organisation
identifier:

    profile:{memberNo}
    prefs:{personId}
    org:{tenantId}

Keys that omit the organisation identifier risk serving one organisation's data
to another when a single cache instance is shared across organisations.

**Recommendation:** prefix all three keys with the organisation identifier.

**Client response due:** 2026-09-12.

=============== FILE: ops/redis-2026-09-10.md ===============
# Redis - members API instance, night of 2026-09-09

maxmemory 16 GB, used 12.5 GB (78%), eviction policy `allkeys-lru`.
Evictions in the last 24h: 0. First eviction expected at roughly 15.4 GB.

## By key prefix

| Prefix     | Keys      | Memory  | Hit rate | Avg value |
|------------|-----------|---------|----------|-----------|
| `prefs:`   | 1,940,220 | 7.6 GB  | 94.1%    | 3.9 KB    |
| `profile:` | 611       | 0.1 GB  | 71.0%    | 0.2 KB    |
| `org:`     | 4,118     | 0.1 GB  | 88.4%    | 0.2 KB    |
| other      |           | 4.7 GB  |          |           |

Note from the platform team: `profile:` holds far fewer keys than we have
members. Nobody has looked into why.
