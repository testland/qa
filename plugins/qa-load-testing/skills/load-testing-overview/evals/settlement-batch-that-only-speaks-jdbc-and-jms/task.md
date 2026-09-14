# One tool for everything, says the memo

## Problem Description

I run the platform group at Kestrel Payments. Our VP of Engineering signed off a
memo last Thursday that standardises performance testing on a single tool across
four workloads, and I have until the 26th to either implement it or come back
with a reasoned alternative. I would rather come back with the alternative where
the memo is wrong, but the reasoning has to hold up in front of him, and "it
isn't a great fit" will not survive that room. He will want to know which fact
about the workload forces the answer, and he will want to see the command.

The four workloads are described in the attached notes and they are genuinely not
alike. One is a nightly batch. One is a plain public JSON API owned by a
six-person Node team that already has a script in git and a green pipeline. One
is a twelve-year-old admin console whose only remaining experts are two manual QA
analysts who do not write code and are not going to start before the 26th. One
signs every request with an in-house Python library that the crypto team has
refused, in writing, to maintain a second copy of - and the lead on that one has
already replied to the memo with a counter-proposal, which is attached too. He
has run it, he likes it, and he is not wrong about the crypto.

Two org-wide rules predate the memo and are restated in it. R1: every test
artefact is reviewed in a pull request before it can run against staging. R2: CI
has to go red on its own when a run misses its budget, because we are not writing
or maintaining a results parser to do it for us. The memo states that the plan as
written already satisfies both, and I am the one who will be asked to confirm
that in the room, so I need the document to be accurate about it workload by
workload.

## Output Specification

1. Write `docs/tooling-decision.md` with one section per workload: the choice,
   the single observable fact about that workload that drives it, and the exact
   command CI (or the operator) would run.
2. For each workload, say whether R1 and R2 hold as written. Where one of them
   does not, name which one gives and what the team loses by giving it up.
3. Do not edit the attached notes, the reply, or the existing script under
   `services/`.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/memo-2026-09-04.md ===============
# Performance tooling standardisation - decision memo

Author: D. Aroyo, VP Engineering
Date: 2026-09-04
Status: signed off, implementation due 2026-09-26

## Decision

All four workloads below will be covered by k6. We already have a k6 script in
merchant-api, the JS team likes it, and one tool means one set of dashboards and
one thing to train people on.

## How each workload gets there

1. **merchant-api** - already done. Extend the existing smoke script.
2. **settlement-runner** - the team builds a small HTTP shim (`settlement-probe`)
   that wraps the JDBC writes and the MQ publish behind REST endpoints, so k6 can
   drive them over HTTP like everything else. Estimated three weeks.
3. **terminal-console** - the QA analysts record their flows with a browser
   recorder; someone on the platform team converts the recordings into k6 scripts
   each quarter.
4. **risk-scoring** - reimplement the request-signing routine in JavaScript so k6
   can call the endpoint directly. Crypto have said they will not own a second
   implementation, so the load-test copy is maintained by us.

## Standing rules (unchanged)

- **R1.** Every test artefact is reviewed in a pull request before it runs
  against staging.
- **R2.** CI must fail on its own when a run misses its budget. We are not
  writing or maintaining result parsers.

Both rules are satisfied by the plan above.

## Appendix - Saturday maintenance window

Whatever we end up with for terminal-console, P. Nnamdi and R. Voss will drive
the run from the tool's own window on their laptops during the Saturday
maintenance slot, so they can watch it live and stop it if the console wedges.

=============== FILE: docs/reply-risk-scoring.md ===============
# Reply to the tooling memo - risk-scoring

From: H. Okonkwo, risk-scoring tech lead
Date: 2026-09-08

We are not reimplementing `kestrel_sig` in JavaScript. Crypto have said no in
writing and my four people write Python all day and no JS at all.

The alternative is obvious and I already have it running on my laptop: drive
`POST /v1/score` from a Python load tool and import `kestrel_sig` directly, so
the test signs exactly the way production signs. One dependency, no second
implementation, nothing new for crypto to audit. That is the memo's actual
objection dealt with.

R2 is covered too. The runner exits non-zero by itself, so CI goes red with no
parser anywhere. This is what I ran on Tuesday and it is what I would put in the
pipeline as-is:

```
locust -f tests/load/locustfile.py \
  --users 200 --spawn-rate 20 --run-time 10m \
  --host https://staging.risk.internal \
  --exit-code-on-error 1
```

That gives D. Aroyo his 120 ms p99 gate without anybody writing a line of
result-parsing code. If platform agree, I would like this signed off this week so
we can stop discussing it.

=============== FILE: services/settlement-runner/RUNBOOK.md ===============
# settlement-runner - nightly batch

Kicks off at 23:10 UTC. One cycle:

1. Poll the acquirer's SFTP drop for `SETTLE_YYYYMMDD.psv` (~310 MB, 1.4M lines).
2. Parse and upsert every line into MariaDB over **JDBC**, batch size 500,
   against `settlement_line` (partitioned monthly, currently 412M rows).
3. Publish one `settlement.line.posted` message per accepted row to **IBM MQ over
   JMS**, transacted, 500 per commit.
4. POST a completion webhook to merchant-api once the cycle ends.

## 2026-08-31

Month-end. Step 2 went from 41 minutes to 4h20. Step 3 backed up behind it. The
window closed with 180k messages unsent and the acquirer reconciliation failed on
the Monday. Steps 1 and 4 completed in their usual times.

## Staging

A staging MariaDB restored from a month-end snapshot and a staging queue manager
both exist and are sized like production. Connection pool is 40, commit sizes as
above.

=============== FILE: services/merchant-api/package.json ===============
{
  "name": "@kestrel/merchant-api",
  "version": "4.8.2",
  "private": true,
  "engines": { "node": ">=22" },
  "scripts": {
    "test": "node --test",
    "load:smoke": "k6 run load/smoke.js"
  },
  "dependencies": {
    "fastify": "5.2.0",
    "pg": "8.13.1"
  }
}

=============== FILE: services/merchant-api/load/smoke.js ===============
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 5,
  duration: '60s',
  thresholds: {
    http_req_duration: ['p(95)<400'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const res = http.get(`${__ENV.BASE_URL}/v1/merchants/self`, {
    headers: { Authorization: `Bearer ${__ENV.API_TOKEN}` },
  });
  check(res, { 'status 200': (r) => r.status === 200 });
  sleep(1);
}

=============== FILE: services/terminal-console/NOTES.md ===============
# terminal-console (legacy)

Java 8, server-rendered JSP, form posts, `JSESSIONID` cookie, no JSON API and no
plans for one. Runs the card-terminal estate: activation, key rotation, refund
reversal, end-of-day totals.

Nobody on the platform team knows these flows. The two people who do are
P. Nnamdi and R. Voss, both manual QA analysts. Neither writes code; both have
said so in writing, and it is not a gap we are closing before the 26th.

Terminal firmware ships roughly monthly and the console flows change with it.

=============== FILE: services/risk-scoring/README.md ===============
# risk-scoring

`POST /v1/score` - synchronous, p99 budget 120 ms, called on every authorisation.
The budget is in the service's SLO and is the number the memo expects CI to gate.

Every request must carry `X-Kestrel-Signature`, computed by `kestrel_sig`, an
internal Python package (wheel on the internal index). It derives a per-merchant
key through a KDF, canonicalises the body, and signs. The crypto team's policy,
restated on 2026-08-19 in writing: **one implementation, in Python, audited
annually.** They will not review or support a second one, including a test-only
copy.

The team that owns risk-scoring is four data scientists. They write Python all
day and no JavaScript at all.
