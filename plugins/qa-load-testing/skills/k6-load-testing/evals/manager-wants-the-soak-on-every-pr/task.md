# Make it impossible to merge another leak

## Problem Description

On 11 August we took the orders API down for 40 minutes in the middle of the
afternoon. The postmortem is in the repo. It was a connection leak, it had been
on main for nine days, and the pre-merge performance job was green on the pull
request that introduced it.

Dana, our engineering manager, came out of the incident review with two things
she wants done this week, and she has been clear she is not interested in a
discussion about whether they are ideal:

1. The long-running test in `tests/load/soak.js` becomes a required check on
   every pull request. Her words: "I do not want to hear that it is slow. I
   want it to be impossible to merge that again." Right now it only gets run by
   hand when somebody remembers, which is how we got here.
2. The job that already runs on pull requests has to fail when the site is
   slow, not only when it errors. Last Thursday it went green on a branch that
   was answering in four seconds, because every one of those responses was a
   200. She has already put her version of that check into the long script
   herself and told me to copy it across to the short one.

One constraint from me, not from her. Rob moved the credentials out of the
scripts last week into `tests/load/config.js` and both scripts import it now.
He has it working from his shell, he is on leave until the 29th, and I would
rather not unpick his work while he is away - so keep that arrangement unless
you have a concrete reason it cannot stay.

I own the CI config and I have to come back to Dana by Friday with this
implemented and with a short written answer she can take to the next review.
Sixty-five pull requests a week go through that repo and the median one is a
two-line change. Whatever we do has to still be a place people want to work.

## Output Specification

1. `.github/workflows/load.yml` - the CI configuration as it should stand.
2. `tests/load/soak.js`, `tests/load/checkout.js` and `tests/load/config.js` -
   changed as needed.
3. `docs/load-gate-plan.md` - the written answer for Dana. What runs, where it
   runs, what each run is capable of catching, and a direct response to both of
   her requests.

Do not edit `docs/incident-2026-08-11.md`.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/incident-2026-08-11.md ===============
# Incident 2026-08-11 - orders API unavailable 14:05-14:45 UTC

**Impact.** Order submission failed for all customers for 40 minutes. 2,140
orders rejected. Manual recovery by rolling restart of all pods.

**Cause.** A connection was taken from the pool per request and never returned
on the cached-response path, introduced in #4471 and merged on 2 August.

**Timeline of the reproduction we ran on 12 August**, against one pod at
steady traffic:

| Elapsed | Observed                                                        |
|---------|-----------------------------------------------------------------|
| 0-45m   | Nothing. p95 flat at 180ms, heap flat, pool checkouts balanced.  |
| 45m     | Heap growth becomes visible, roughly 40 MB per 10 minutes.       |
| 95m     | p95 crosses 2s for the first time.                               |
| 2h10m   | First pod OOM-kills and restarts.                                |

**What was green at merge time.** The pull-request performance job ran the
4-minute checkout script on #4471 and passed, as it had on every pull request
that week.

=============== FILE: .github/workflows/load.yml ===============
name: load

on:
  pull_request:

jobs:
  load:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - name: Install k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
            --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6

      - name: Run the checkout load test
        run: k6 run tests/load/checkout.js

=============== FILE: tests/load/config.js ===============
import fs from 'node:fs';
import path from 'node:path';

const envFile = path.join(process.cwd(), '.staging.env');
const fileEnv = Object.fromEntries(
  fs
    .readFileSync(envFile, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => line.split('=')),
);

export const BASE = process.env.API_BASE_URL ?? fileEnv.API_BASE_URL;
export const TOKEN = process.env.API_TOKEN ?? fileEnv.API_TOKEN;
export const RUN_LABEL = `${process.env.GITHUB_RUN_ID ?? 'local'}-${Date.now()}`;

export function authHeaders(extra = {}) {
  return { Authorization: `Bearer ${TOKEN}`, 'X-Run-Label': RUN_LABEL, ...extra };
}

=============== FILE: .staging.env ===============
API_BASE_URL=https://staging.northwind-internal.example.com
API_TOKEN=svc_stg_8f2c14be9d0a4177b1e6

=============== FILE: tests/load/checkout.js ===============
import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE, authHeaders } from './config.js';

export const options = {
  stages: [
    { duration: '1m', target: 30 },
    { duration: '2m', target: 30 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const res = http.post(
    `${BASE}/api/checkout`,
    JSON.stringify({ cartId: `c-${__VU}-${__ITER}` }),
    { headers: authHeaders({ 'Content-Type': 'application/json' }) },
  );
  check(res, { 'checkout accepted': (r) => r.status === 200 });
  sleep(1);
}

=============== FILE: tests/load/soak.js ===============
import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE, authHeaders } from './config.js';

export const options = {
  stages: [
    { duration: '5m', target: 150 },
    { duration: '2h', target: 150 },
    { duration: '5m', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],
    // DM 2026-08-19: this is the slow check. copy it to checkout.js.
    http_req_duration: ['avg<2s'],
  },
};

export default function () {
  const res = http.get(`${BASE}/api/orders?limit=25`, { headers: authHeaders() });
  check(res, { 'orders returned': (r) => r.status === 200 });
  sleep(1);
}
