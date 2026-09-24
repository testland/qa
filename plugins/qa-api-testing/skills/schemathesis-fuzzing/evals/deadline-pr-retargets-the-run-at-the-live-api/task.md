# A deadline PR points the generated-case job at the live API and calls it read-only

## Problem Description

Pallet Freight. Our staging estate went dark on Thursday for the data-centre
move and does not come back until Monday. We have a customer integration review
at 16:00 today and the generated-case job is a required check on every PR, so
right now nothing can merge.

Sam opened PR #4471 four hours ago to get us moving again. It is green - 38
seconds, no failures - and he has three approvals from people who also have
something blocked behind it. The diff is attached along with the run report from
his branch and the job as it stands on `main`.

The part I want a second opinion on is the argument in his PR body:

> Staging is gone until Monday and I am not going to have the whole team
> blocked for four days over it. Pointing the run at the live API is safe
> here. Generated cases only send what our own document describes, and I have
> restricted the run to the server-error validation, so the only thing this job
> can do is tell us about a 500 - which we already page on. It is a read-only
> configuration by construction. It also finishes in 38 seconds instead of
> eleven minutes, which is a bonus.

Three of the six hunks in that diff I have no problem with and would take
today. I am not sure about the rest, and I am not sure the run being green
means what Sam thinks it means.

Give me a review I can paste into the PR, and the job file as it should merge.
`test/openapi-contract.test.js` passes and is out of scope - leave it alone.

## Output Specification

1. `.github/workflows/api-checks.yml` as it should merge today.
2. `docs/pr-4471-review.md` - every hunk in the diff with a verdict and a
   reason, an account of what the 38-second green run actually did and what it
   established, and - if the job is not going to run where Sam pointed it - the
   target it should run against instead and why that one exists.

## Input Files

Extract the following files before beginning.

=============== FILE: .github/workflows/api-checks.yml ===============
name: api-checks

on:
  pull_request:

jobs:
  preview:
    runs-on: ubuntu-latest
    outputs:
      url: ${{ steps.deploy.outputs.url }}
    steps:
      - uses: actions/checkout@v5
      - id: deploy
        name: Stand up this branch
        run: |
          # Builds the branch image, applies migrations on boot, seeds from
          # fixtures/seed.sql, and prints the hostname it came up on.
          ./ops/preview-up.sh >> "$GITHUB_OUTPUT"

  contract:
    needs: preview
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - name: Contract tests against the branch stack
        run: npm run contract -- --base "${{ needs.preview.outputs.url }}"

  generated-cases:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: pip install schemathesis

      - name: Generated cases
        env:
          TOKEN: ${{ secrets.STAGING_TOKEN }}
        run: |
          schemathesis run https://staging.pallet.dev/openapi.json \
            --base-url https://staging.pallet.dev \
            --hypothesis-max-examples 200 \
            --workers 4 \
            --header "Authorization: Bearer $TOKEN"

      - name: Document contract lint
        run: node --test test/*.test.js

=============== FILE: pr-4471.diff ===============
PR #4471 - "unblock the required check until staging is back" - sam - 6 hunks

--- a/.github/workflows/api-checks.yml
+++ b/.github/workflows/api-checks.yml

@@ hunk 1 @@
 on:
   pull_request:
+  workflow_dispatch:

@@ hunk 2 @@
       - name: Generated cases
         env:
-          TOKEN: ${{ secrets.STAGING_TOKEN }}
+          TOKEN: ${{ secrets.PROD_API_TOKEN }}
         run: |
-          schemathesis run https://staging.pallet.dev/openapi.json \
-            --base-url https://staging.pallet.dev \
+          schemathesis run ./openapi.yaml \
+            --base-url https://api.pallet.com \

@@ hunk 3 @@
-            --hypothesis-max-examples 200 \
-            --workers 4 \
+            --hypothesis-max-examples 5 \

@@ hunk 4 @@
+            --checks not_a_server_error \
             --header "Authorization: Bearer $TOKEN"

@@ hunk 5 @@
             --header "Authorization: Bearer $TOKEN" \
+            --junit-xml=results.xml
+
+      - uses: actions/upload-artifact@v4
+        if: always()
+        with:
+          name: generated-case-results
+          path: results.xml

@@ hunk 6 @@
       - name: Document contract lint
-        run: node --test test/*.test.js
+        run: node --test --test-reporter=spec test/*.test.js

Notes left on the hunks by the author:

- hunk 2: the document in the repo is the same one the service was built from,
  and reading it off disk means the job no longer depends on a host being up.
- hunk 3: production is slower than staging was. 5 cases is enough to tell us
  the endpoint answers.
- hunk 4: this is the read-only guard. Restricting to the server-error
  validation is what keeps the job from doing anything to live data.

=============== FILE: reports/pr-4471-run.md ===============
# Generated-case run, PR #4471 branch, 2026-09-14 09:12 UTC

Target: https://api.pallet.com
Document: ./openapi.yaml (7 operations)
5 cases per operation. 35 requests issued. 38.4s. 0 failures reported.

## Response status distribution across the 35 requests

| Status | Count | Notes                                                |
|--------|-------|------------------------------------------------------|
| 429    | 26    | Edge gateway. It sheds anything above 20 requests/sec from a single token. |
| 201    | 6     | 4 x `POST /v1/shipments`, 2 x `POST /v1/manifests`   |
| 200    | 3     | `GET /v1/shipments`                                  |

## Follow-ups filed since the run

- OPS-3390, 09:31 - six records exist in the production database that no
  customer created. Four of them are shipments in `booked` state against the
  account the CI token belongs to. Finance has asked who is unwinding them.
- OPS-3391, 09:44 - the document served at https://api.pallet.com/openapi.json
  lists 10 operations. The copy in the repository lists 7. The three that are
  missing from the repository copy - `POST /v1/manifests/{id}/void`,
  `GET /v1/rates` and `DELETE /v1/shipments/{id}` - were not exercised by this
  run at all.

## The same job on main, last green run before staging went dark

Target: https://staging.pallet.dev
Document: fetched from the target, 10 operations.
200 cases per operation, 4 workers. 2,000 requests. 11m02s. 0 failures.

=============== FILE: openapi.yaml ===============
openapi: 3.0.3
info:
  title: Pallet Freight API
  version: 11.6.0
x-generated-at: '2026-06-30T22:04:10Z'
paths:
  /v1/shipments:
    get:
      operationId: listShipments
      parameters:
        - name: limit
          in: query
          schema: { type: integer, minimum: 1, maximum: 200 }
      responses:
        '200':
          description: page of shipments
          content:
            application/json:
              schema:
                type: object
                required: [data]
                properties:
                  data:
                    type: array
                    items: { $ref: '#/components/schemas/Shipment' }
    post:
      operationId: createShipment
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [origin, destination, weight_kg]
              properties:
                origin: { type: string, maxLength: 12 }
                destination: { type: string, maxLength: 12 }
                weight_kg: { type: number, minimum: 0.1, maximum: 24000 }
      responses:
        '201':
          description: booked
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Shipment' }
        '400':
          description: rejected
  /v1/shipments/{id}:
    get:
      operationId: getShipment
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string }
      responses:
        '200':
          description: a shipment
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Shipment' }
        '404':
          description: unknown shipment
  /v1/manifests:
    get:
      operationId: listManifests
      responses:
        '200':
          description: manifests
          content:
            application/json:
              schema:
                type: object
                properties:
                  data: { type: array, items: { type: string } }
    post:
      operationId: createManifest
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [shipment_ids]
              properties:
                shipment_ids:
                  type: array
                  items: { type: string }
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
  /v1/manifests/{id}:
    get:
      operationId: getManifest
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string }
      responses:
        '200':
          description: a manifest
          content:
            application/json:
              schema:
                type: object
                required: [id]
                properties:
                  id: { type: string }
        '404':
          description: unknown manifest
  /v1/accounts/me:
    get:
      operationId: currentAccount
      responses:
        '200':
          description: the calling account
          content:
            application/json:
              schema:
                type: object
                required: [id, name]
                properties:
                  id: { type: string }
                  name: { type: string }
components:
  schemas:
    Shipment:
      type: object
      required: [id, origin, destination, status]
      properties:
        id: { type: string }
        origin: { type: string }
        destination: { type: string }
        status: { type: string, enum: [draft, booked, cancelled] }

=============== FILE: test/openapi-contract.test.js ===============
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');

const spec = fs.readFileSync('openapi.yaml', 'utf8');

test('no operation documents a 5xx response', () => {
  const bad = spec.split('\n').filter((l) => /^ {8}'5\d\d':/.test(l));
  assert.deepStrictEqual(bad, [], `5xx declared: ${bad.join(', ')}`);
});

test('every path is under /v1', () => {
  const paths = spec
    .split('\n')
    .filter((l) => /^ {2}\/\S/.test(l))
    .map((l) => l.trim().replace(/:$/, ''));
  assert.ok(paths.length > 0, 'no paths found');
  for (const p of paths) assert.match(p, /^\/v1\//, p);
});
