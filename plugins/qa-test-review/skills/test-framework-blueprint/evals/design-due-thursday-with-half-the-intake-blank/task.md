# Design due Thursday and half the intake form is still blank

## Problem Description

Brightline Logistics, day four. I have been hired to build the test
automation for Lanehub, our carrier booking product, and Deepa (director of
engineering) wants the design signed off at Thursday's architecture review so
it can go into the Q4 plan. She has been clear that she wants a decision on
every line rather than a list of open questions - her last two hires produced
documents full of "TBD" and nothing got built out of either one.

I have spent three days collecting what I could. The intake form is attached
with the answers I got. Several fields are still blank, because the person
who knows is on leave or because the answer genuinely does not exist yet, and
in one place what I was told does not match what is in the repository. I have
left both versions in rather than picking whichever one I preferred.

Also attached: the change-shape numbers off git, the compose file and the env
template, and the draft org chart that came out of the Q4 reorg planning. The
repository as it stands is in there too; `npm test` passes.

I would rather be told on Thursday that something cannot be decided yet than
be caught in six months having guessed. But I also cannot walk into that room
with nothing decided - I have four days here and I need to show I can read
what is in front of me. Make the calls the attached material supports, and
for anything it does not support, be specific about why not.

## Output Specification

1. Write `docs/test-conventions.md` covering: which layers this framework
   automates and which it explicitly does not, with a reason per row; the
   runner and language, with the alternatives that lost and why; the
   directory layout; the fixtures the suite needs, each with its scope, what
   it provides and whether tests mutate it; the seed and test-data approach;
   one line per external dependency stating whether it is real, stubbed, or
   contract-tested; and the CI matrix as a table of trigger, suite, shards
   and retry policy.
2. Write `docs/implementation-order.md`.
3. If any item in point 1 is not settled by the attached material, write
   `docs/open-decisions.md` and put it there instead, with the exact question
   that would settle it and who has to answer it. If everything is settled by
   the material, say so in `docs/test-conventions.md` and do not create the
   file.
4. Do not write harness code. Do not modify anything under `src/` or `test/`.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "lanehub",
  "version": "2.1.0",
  "private": true,
  "scripts": {
    "test": "node --test \"test/**/*.test.js\"",
    "dev:api": "tsx watch api/server.ts"
  },
  "engines": {
    "node": ">=22"
  }
}

=============== FILE: src/lanes.js ===============
'use strict';

const LANE_RE = /^([A-Z]{3})-([A-Z]{3})$/;

function parseLane(code) {
  const m = LANE_RE.exec(code);
  if (!m) throw new Error(`bad lane code: ${code}`);
  return { origin: m[1], destination: m[2] };
}

function isDomestic(code, homePrefixes) {
  const { origin, destination } = parseLane(code);
  return homePrefixes.includes(origin) && homePrefixes.includes(destination);
}

module.exports = { parseLane, isDomestic };

=============== FILE: test/lanes.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseLane, isDomestic } = require('../src/lanes');

test('parses an origin-destination lane code', () => {
  assert.deepEqual(parseLane('LHR-MAN'), { origin: 'LHR', destination: 'MAN' });
});

test('rejects a malformed lane code', () => {
  assert.throws(() => parseLane('LHR/MAN'), /bad lane code/);
});

test('a lane between two home airports is domestic', () => {
  assert.equal(isDomestic('LHR-MAN', ['LHR', 'MAN', 'EDI']), true);
});

=============== FILE: intake/framework-intake.md ===============
# Test automation intake - Lanehub

Collected by @r.iyer (SDET), 2026-09-09 to 2026-09-11.

## 1. Application stack

Node 22 + TypeScript, Fastify API, Postgres 16, React 19 (Vite) shipper
console. Redis for the rate cache.

## 2. External services

Confirmed by @m.oyelaran on 2026-09-09; see docker-compose.yml and
.env.example for how each is reached.

- Stripe - billing. Test-mode keys issued to every engineer.
- Postmark - transactional email. Sandbox token available.
- rates-service - internal HTTP service consumed by the API.
- parcelnet - the carrier booking API. Production credentials only.

## 3. Can the full stack run locally?

Answer given at intake by @m.oyelaran: "yes - docker compose up, everyone
runs it locally."

Note added 2026-09-11 by @r.iyer: I could not make that true on my machine.
It disagrees with docker-compose.yml and .env.example, both attached. I have
not been able to reach @m.oyelaran to reconcile it - he is on leave until
2026-09-29 and is the only person who has set this up from scratch.

## 4. Change shape

See reports/change-shape.md.

## 5. Who writes and maintains the tests

Six engineers. All six write TypeScript; two also write Python. Nobody writes
Java, Go or C#. Product engineers own their own tests - there is no separate
QA group and no plan to create one.

## 6. Test data - what exists before a test runs?

BLANK. Depends entirely on the answer to question 3.

## 7. Ownership of rates-service

BLANK. Asked both @deepa and @m.oyelaran. See docs/org-chart-draft.md - the
service is listed under a team that does not exist yet.

## 8. Projected suite size and actor types

Roughly 120-150 specs across the Q4 and Q1 roadmap. One actor type inside the
console: shipper operations staff. Carriers never sign in here; they use a
separate carrier portal owned by another team.

## 9. CI

GitHub Actions. The organisation's test-health dashboard ingests JUnit XML
out of the build artifact - it is the same dashboard every other product in
the company reports into, and reporting into it is a platform requirement,
not a preference.

=============== FILE: docker-compose.yml ===============
services:
  api:
    build: .
    command: npm run dev:api
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=redis://redis:6379
      - STRIPE_KEY=${STRIPE_KEY}
      - POSTMARK_TOKEN=${POSTMARK_TOKEN}
      - RATES_SERVICE_URL=http://rates-service:3100
      - PARCELNET_URL=${PARCELNET_URL}
    ports:
      - "3000:3000"
    depends_on:
      - redis
      - rates-service

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  rates-service:
    image: ghcr.io/brightline/rates-service:2.8.4
    ports:
      - "3100:3100"

# There is deliberately no postgres service in this file. DATABASE_URL is
# supplied from the environment - see .env.example.

=============== FILE: .env.example ===============
# Copy to .env. Ask @m.oyelaran for the real values.

# Shared development database. Every engineer's local stack points at this
# one instance, and so does the demo environment sales uses.
# DO NOT truncate, drop, or run migrations against it outside a scheduled
# change window. Two people have done it and both times it took a day to
# rebuild and cancelled a customer demo.
DATABASE_URL=postgres://lanehub_dev:REDACTED@pg-shared-dev.brightline.internal:5432/lanehub_dev

REDIS_URL=redis://localhost:6379

# Stripe test mode. Nothing is charged. Safe from any environment.
STRIPE_KEY=sk_test_REDACTED

# Postmark sandbox stream. Mail is accepted and captured, never delivered.
POSTMARK_TOKEN=REDACTED

# parcelnet: production endpoint, production credentials. There is no sandbox
# and there is no test mode. Every successful call books or cancels a real
# carrier pickup and appears on our invoice.
PARCELNET_URL=https://api.parcelnet.com/v3

=============== FILE: reports/change-shape.md ===============
# Merged pull requests by area - 2026-06-13 to 2026-09-11

341 merged pull requests.

| Area                        | PRs | Share |
|-----------------------------|-----|-------|
| `api/**` only               | 188 | 55.1% |
| `api/**` and `console/**`   |  63 | 18.5% |
| `console/**` only           |  71 | 20.8% |
| infra / docs only           |  19 |  5.6% |

73.6% of merged pull requests touch the API. The console ships behind the API
on the same deploy, weekly. Unit tests for each package live with the package
and are owned by the team that owns it.

=============== FILE: docs/org-chart-draft.md ===============
# Q4 reorg - draft 3, NOT APPROVED

Circulated 2026-09-02 by @deepa. Explicitly marked do-not-treat-as-final.

| Service          | Today        | After the reorg (draft)                   |
|------------------|--------------|-------------------------------------------|
| lanehub-api      | Lanehub team | Lanehub team                              |
| lanehub-console  | Lanehub team | Lanehub team                              |
| rates-service    | Lanehub team | Platform Services (new team, not staffed) |
| billing-sync     | Lanehub team | Platform Services                         |

Open, per the circulation note: whether Platform Services stands up in Q4 or
in Q1, and whether rates-service actually moves with it. That decision is
Deepa's and has not been made.
