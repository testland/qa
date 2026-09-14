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
