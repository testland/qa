# 41 of 44 operations red, and a branch that turns every one of them green

## Problem Description

Halcyon Payouts. Our payouts API publishes 44 operations. The job that builds
its cases from the API document and fires them at staging has been red since
Tuesday morning - 41 of the 44 operations failing. We ship 9.4 on Thursday and
that job is a required check, so nothing merges until it is green.

Priya opened `fix/api-fuzz-green` on Friday afternoon. It is green. It went
green on the first push and it has stayed green through four re-runs. She wants
it merged this morning so the release train can move, and her argument is that
we are two days out and the failures are our own paperwork being behind the
service, not the service being broken. Her diff is attached and it is small.

I am not comfortable merging it without someone who does not have the release
on their calendar looking at it first. Specifically I want to know:

- whether that branch is actually still testing the API, or whether it is green
  for a reason I am not going to like once the release is out;
- what is really behind the 41, because I do not believe they are all the same
  thing and Priya's summary treats them as one bucket;
- what should run on Thursday morning, given that the merge window is real and
  the job currently takes 14 minutes.

The run report from Tuesday is attached along with the current job definition,
the test module, the relevant slice of the changelog, and the API document as
it sits in the repo. `test/spec-lint.test.js` passes today and is not part of
this - leave it alone.

Do not hand-edit `openapi.yaml` to make cases stop failing. If the document is
wrong, say where the document actually comes from and what has to happen to it.

## Output Specification

1. `.github/workflows/api-fuzz.yml` and `tests/api/test_generated.py` as they
   should run on Thursday morning.
2. `docs/api-fuzz-triage.md` - a verdict on `fix/api-fuzz-green` stating exactly
   what that branch stops enforcing and why it went green; the 41 failures split
   into their real groups with a cause per group; and, for anything that is a
   product defect rather than paperwork, the reproducer and what it blocks.

## Input Files

Extract the following files before beginning.

=============== FILE: .github/workflows/api-fuzz.yml ===============
name: api-fuzz

on:
  pull_request:
  schedule:
    - cron: '0 4 * * *'

jobs:
  generated-cases:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: pip install schemathesis pytest

      - name: CLI sweep
        env:
          TOKEN: ${{ secrets.STAGING_TOKEN }}
        run: |
          schemathesis run https://staging.halcyon.dev/openapi.json \
            --base-url https://staging.halcyon.dev \
            --hypothesis-max-examples 200 \
            --workers 4 \
            --header "Authorization: Bearer $TOKEN" \
            --junit-xml=results.xml

      - name: Module sweep
        env:
          TOKEN: ${{ secrets.STAGING_TOKEN }}
        run: pytest tests/api -q

      - name: Document lint
        run: node --test test/*.test.js

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: api-fuzz-results
          path: results.xml

=============== FILE: tests/api/test_generated.py ===============
import os

import schemathesis

schema = schemathesis.openapi.from_url(
    "https://staging.halcyon.dev/openapi.json",
    base_url="https://staging.halcyon.dev",
)


@schema.parametrize()
@schemathesis.hook("before_call")
def attach_token(context, case):
    case.headers["Authorization"] = f"Bearer {os.environ['TOKEN']}"


def test_generated(case):
    case.call_and_validate()

=============== FILE: branch/fix-api-fuzz-green.diff ===============
commit 8f31c0a  fix/api-fuzz-green  priya  2026-09-12
    api-fuzz: unblock the release train

diff --git a/tests/api/test_generated.py b/tests/api/test_generated.py
--- a/tests/api/test_generated.py
+++ b/tests/api/test_generated.py
@@
 def test_generated(case):
-    case.call_and_validate()
+    # Release week. We stop gating on our own document being behind the
+    # service, but we still fire every generated request at staging, and a
+    # 5xx still blows up the request, so on-call cover is unchanged.
+    case.call()

diff --git a/.github/workflows/api-fuzz.yml b/.github/workflows/api-fuzz.yml
--- a/.github/workflows/api-fuzz.yml
+++ b/.github/workflows/api-fuzz.yml
@@
           schemathesis run https://staging.halcyon.dev/openapi.json \
             --base-url https://staging.halcyon.dev \
-            --hypothesis-max-examples 200 \
-            --workers 4 \
+            --checks not_a_server_error \
+            --hypothesis-max-examples 5 \
             --header "Authorization: Bearer $TOKEN" \
             --junit-xml=results.xml

Branch notes (from the PR body):

    Two changes. The CLI sweep now runs the server-error check, which is the
    one that maps to a customer being hurt, and 5 cases per operation instead
    of 200 so the job comes in under the merge window - it finishes in 1m40s
    now instead of 14 minutes. The module sweep still issues the same traffic,
    it just does not fail us on documentation.

=============== FILE: reports/fuzz-run-2026-09-12.md ===============
# Generated-case run, main @ 3a91d7f, 2026-09-12 04:00 UTC

44 operations. 200 cases per operation, 4 workers. 8,800 requests issued.
14m11s. 41 operations failed, 3 passed.

## Failures by reported check

| Check                       | Operations | Requests that failed |
|-----------------------------|------------|----------------------|
| response_schema_conformance | 38         | 7,412                |
| not_a_server_error          | 3          | 12                   |

## response_schema_conformance - 38 operations

Every one of the 38 reports the same thing on the same field. Sample, from
`GET /v1/payouts/{id}`:

    - amount: '120000' is not of type 'integer'
      path: $.amount
      documented: {"type": "integer", "format": "int64"}
      received: "120000"

The 38 operations are every operation whose response embeds `Money`. The six
operations that do not embed `Money` are the three that passed plus the three
that failed on server errors.

## not_a_server_error - 3 operations

These are unrelated to each other and to the 38 above.

1. `POST /v1/payouts/{id}/cancel` - 500 when `reason` is the empty string.
   First generated at example 63 of 200. Seed 41780112.

       curl -X POST https://staging.halcyon.dev/v1/payouts/pa_1/cancel \
         -H 'Content-Type: application/json' -d '{"reason": ""}'

   Reproduces on staging and on production. Handler last touched in June.

2. `GET /v1/payouts` - 500 when `limit` is 0. First generated at example 88
   of 200. Seed 2255903. `limit` is documented `minimum: 0`.

3. `POST /v1/recipients` - 500 when `iban` is exactly 34 characters, which is
   the documented `maxLength`. First generated at example 141 of 200. Seed
   9910044. Reproduces on production.

None of the three has a fix merged. None of the three is in the changelog.

## Same job, fix/api-fuzz-green @ 8f31c0a

44 operations. 44 passed, 0 failed. 220 requests issued in the CLI sweep.
1m38s. Module sweep: 44 passed. Four re-runs, all green.

=============== FILE: CHANGELOG.md ===============
# Halcyon Payouts API

## 9.2.0 - 2026-08-28

- **Breaking for JSON clients.** Monetary amounts are now serialised as
  decimal strings rather than integers everywhere `Money` appears in a
  response. Large payouts were losing precision in browser clients that parse
  JSON numbers as doubles. Integrators were notified on 2026-08-14 and the
  three largest have confirmed they parse strings. This is deliberate and it
  is not being reverted.
- Added `POST /v1/recipients` bulk validation.

## 9.1.0 - 2026-08-06

- `GET /v1/payouts` gained `settlement_date` filtering.

=============== FILE: openapi.yaml ===============
# Excerpt for review: the operations named in the run report. The committed
# document carries all 44 and every one of the other 40 is shaped the same way.
openapi: 3.0.3
info:
  title: Halcyon Payouts API
  version: 9.1.0
x-generated-at: '2026-08-07T02:11:44Z'
x-generated-by: halcyon-openapi-gen, from handler annotations, build image only
paths:
  /v1/payouts:
    get:
      operationId: listPayouts
      parameters:
        - name: limit
          in: query
          schema: { type: integer, minimum: 0, maximum: 500 }
      responses:
        '200':
          description: page of payouts
          content:
            application/json:
              schema:
                type: object
                required: [data]
                properties:
                  data:
                    type: array
                    items: { $ref: '#/components/schemas/Payout' }
  /v1/payouts/{id}:
    get:
      operationId: getPayout
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string }
      responses:
        '200':
          description: a payout
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Payout' }
        '404':
          description: unknown payout
  /v1/payouts/{id}/cancel:
    post:
      operationId: cancelPayout
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [reason]
              properties:
                reason: { type: string }
      responses:
        '200':
          description: cancelled
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Payout' }
        '409':
          description: already settled
  /v1/recipients:
    post:
      operationId: createRecipient
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [iban]
              properties:
                iban: { type: string, maxLength: 34 }
      responses:
        '201':
          description: created
          content:
            application/json:
              schema:
                type: object
                required: [id]
                properties:
                  id: { type: string }
        '400':
          description: rejected
components:
  schemas:
    Money:
      type: object
      required: [amount, currency]
      properties:
        amount: { type: integer, format: int64 }
        currency: { type: string, minLength: 3, maxLength: 3 }
    Payout:
      type: object
      required: [id, amount, status]
      properties:
        id: { type: string }
        amount: { $ref: '#/components/schemas/Money' }
        status: { type: string, enum: [pending, paid, cancelled] }

=============== FILE: test/spec-lint.test.js ===============
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');

const spec = fs.readFileSync('openapi.yaml', 'utf8');

test('every documented path is version-prefixed', () => {
  const paths = spec
    .split('\n')
    .filter((l) => /^ {2}\/\S/.test(l))
    .map((l) => l.trim().replace(/:$/, ''));
  assert.ok(paths.length > 0, 'no paths found');
  for (const p of paths) assert.match(p, /^\/v1\//, p);
});

test('the document declares an openapi version', () => {
  assert.match(spec, /^openapi: 3\./m);
});
