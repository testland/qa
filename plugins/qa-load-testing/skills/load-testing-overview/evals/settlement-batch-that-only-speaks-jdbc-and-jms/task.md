# One tool for everything, says the memo

## Problem Description

I run the platform group at Kestrel Payments. Our VP of Engineering signed off a
memo last Thursday that standardises performance testing on a single tool across
four workloads, and I have until the 26th to either implement it or come back with
a reasoned alternative. I would rather come back with the alternative, but the
reasoning has to hold up in front of him, and "it isn't a great fit" will not
survive that room. He will want to know which observable fact about the workload
forces the answer, and he will want to see the command.

The four workloads are in the attached notes and they are genuinely not alike. A
nightly settlement batch. A plain public JSON API owned by a six-person Node team
that already has a script in git and a green pipeline. A twelve-year-old admin
console whose only remaining experts are two manual QA analysts. A scoring service
with a hard p99 in its SLO, called on every authorisation.

The scoring lead has already replied to the memo with a counter-proposal, and his
reply, his test file and the command he ran on Tuesday are all attached. On the
tool he is right and the memo is wrong, so I expect to be agreeing with him, and
he wants it signed off this week. I am the one who will be standing in that room
when the plan gets picked apart, though, so I need the document to be right about
what each of these things actually does, not just about which tool it is.

Two org-wide rules predate the memo and are restated in it. R1: every test artefact
is reviewed in a pull request before it can run against staging. R2: CI has to go
red on its own when a run misses its budget, because we are not writing or
maintaining a results parser to do it for us.

## Output Specification

1. Write `docs/tooling-decision.md` with one section per workload: the choice, the
   single observable fact about that workload that drives it, and the exact command
   CI (or the operator) would run.
2. The memo's closing section makes a claim about R1 and R2. Address it.
3. You may change `services/risk-scoring/tests/load/locustfile.py`. Do not edit the
   memo, the reply, or anything under `services/merchant-api/`.

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

## Appendix - Saturday maintenance window

Whatever we end up with for terminal-console, P. Nnamdi and R. Voss will drive the
run from the tool's own window on their laptops during the Saturday maintenance
slot, so they can watch it live and stop it if the console wedges.

## Standing rules (unchanged)

- **R1.** Every test artefact is reviewed in a pull request before it runs against
  staging.
- **R2.** CI must fail on its own when a run misses its budget. We are not writing
  or maintaining result parsers.

Both rules are satisfied by the plan above, workload by workload.

=============== FILE: docs/reply-risk-scoring.md ===============
# Reply to the tooling memo - risk-scoring

From: H. Okonkwo, risk-scoring tech lead
Date: 2026-09-08

We are not reimplementing `kestrel_sig` in JavaScript. Crypto have said no in
writing, and my four people write Python all day and no JS at all.

The alternative is obvious and I already have it running: drive the scoring
endpoint from a Python load tool and import `kestrel_sig` directly, so the test
signs exactly the way production signs. One dependency, no second implementation,
nothing new for crypto to audit. That is the memo's actual objection dealt with.
The test file is on my branch at `tests/load/locustfile.py`.

R2 is covered too - the runner exits non-zero by itself, so CI goes red with no
parser anywhere. This is what I ran on Tuesday and it is what I would put in the
pipeline as-is:

```
locust -f tests/load/locustfile.py \
  --users 200 --spawn-rate 20 --run-time 10m \
  --host https://staging.risk.internal \
  --exit-code-on-error 1
```

The end-of-run table runs to a few thousand lines now, which is mildly annoying,
but the Aggregated row came out at p99 108 ms against the 120 budget, so we are
inside it with room to spare. That is D. Aroyo's gate, met, without anybody writing
a line of result-parsing code.

If platform agree, I would like this signed off this week so we can stop discussing
it.

=============== FILE: services/risk-scoring/README.md ===============
# risk-scoring

`POST /v1/score/{merchant_id}` - synchronous, called on every authorisation.
**p99 budget 120 ms**, set in the service SLO, and the number the memo expects CI
to gate. Weekday peak is around 1,900 authorisations a second.

`GET /v1/models/current` - returns the active model id and version. Cached in
process, single-digit milliseconds, no signature required. The console polls it,
and so does the load test, to record which model a run scored against.

Every scoring request must carry `X-Kestrel-Signature`, computed by `kestrel_sig`,
an internal Python package (wheel on the internal index). It derives a per-merchant
key through a KDF, canonicalises the body, and signs. The crypto team's policy,
restated on 2026-08-19 in writing: **one implementation, in Python, audited
annually.** They will not review or support a second one, including a test-only
copy.

`tests/load/merchants.txt` is regenerated nightly from the staging merchant table -
12,140 ids as of Tuesday.

The team that owns risk-scoring is four data scientists. They write Python all day
and no JavaScript at all.

=============== FILE: services/risk-scoring/tests/load/locustfile.py ===============
import random

from locust import HttpUser, task

from kestrel_sig import sign

MERCHANTS = [line.strip() for line in open("tests/load/merchants.txt")]


class Scorer(HttpUser):
    @task(3)
    def score(self):
        mid = random.choice(MERCHANTS)
        body = {"merchant": mid, "amount": 4999, "mcc": "5812"}
        self.client.post(
            f"/v1/score/{mid}",
            json=body,
            headers={"X-Kestrel-Signature": sign(mid, body)},
        )

    @task(1)
    def model_version(self):
        self.client.get("/v1/models/current")

=============== FILE: services/settlement-runner/RUNBOOK.md ===============
# settlement-runner - nightly batch

Kicks off at 23:10 UTC. One cycle:

1. Poll the acquirer's SFTP drop for `SETTLE_YYYYMMDD.psv` (~310 MB, 1.4M lines).
2. Parse and upsert every line into MariaDB over **JDBC**, batch size 500, against
   `settlement_line` (partitioned monthly, currently 412M rows).
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

Nobody on the platform team knows these flows. The two people who do are P. Nnamdi
and R. Voss, both manual QA analysts. Neither writes code; both have said so in
writing, and it is not a gap we are closing before the 26th.

Terminal firmware ships roughly monthly and the console flows change with it.
