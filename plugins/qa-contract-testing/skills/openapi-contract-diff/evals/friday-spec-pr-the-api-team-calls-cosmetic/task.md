# PR #4418 is four lines and the API team wants me to add an annotation while I am in there

## Problem Description

We publish a payouts API. Roughly forty integrators are on it, and we ship
generated SDKs in Go, Python and TypeScript off the spec file in this repo - the
generator reads `spec/openapi.yaml` and the SDKs go out with the release.

PR #4418 lands Friday. The API team's note calls the whole thing cosmetic and
gives a reason per change. The reasons are not stupid: two of them are values we
stopped emitting months ago, one is a schema nothing in the file references any
more - I ran the grep myself, it is attached, and it really is zero - and one is
a brand new optional field on a response.

The last paragraph of their note asks me to make a one-line addition to the spec
while I am reviewing. They have been waiting on this release for two sprints and
I am inclined to give them it if it is defensible - what I need from you is what
that line actually buys an integrator who is already running against v2.9.0, and
whether it changes the answer on the change they want it for.

Attached: the spec as PR #4418 leaves it, the spec exactly as we published it at
v2.9.0, the team's note, the grep, how the SDKs get built, and the compatibility
step as it stands.

## Output Specification

1. Write `docs/pr-4418-review.md`. One entry per change in the diff - their note
   lists four - each stating whether it stops the release, what happens to an
   integrator already running against v2.9.0, and what would have to be true for
   that change to ship. A single verdict on the pull request as a whole is not
   an answer.
2. Answer the request in the last paragraph of their note directly. If the
   answer is no, say what they do instead to get as much of #4418 out as
   possible this week.
3. If the compatibility step needs to change, give the exact replacement step.
   Otherwise say it stands.
4. Leave `spec/openapi.yaml` and `evidence/openapi-v2.9.0.yaml` exactly as they
   are. This is a review.

## Input Files

Extract the following files before beginning.

=============== FILE: notes/pr-4418-description.md ===============
# PR #4418 - spec tidy-up ahead of v3.0.0

Four changes, all cosmetic. Please approve today, we are two sprints late.

1. `Payout.status` - dropped `returned` from the enum. Returns moved to their
   own resource in July and we have not emitted `returned` on a payout since
   the 12th.

2. `Payout.rail` - dropped `wire` from the enum. Same situation: wire payouts
   moved over to the treasury product on 2026-08-03 and nothing in the payouts
   service can produce `rail: wire` any more.

3. Deleted `components.schemas.LegacyPayoutEvent`. Dead weight - nothing in the
   file points at it, nothing in the service points at it. See the grep.

4. `GET /v1/payouts/{payoutId}` - added `settledAt` as a new optional property
   on the 200 response. Purely additive.

Last thing. `status` already carries `x-extensible-enum: true`. Add the same
line to `rail` while you are in there - one line, it changes nothing about what
we actually return, and then the compatibility step stops arguing with us every
time we tidy an enum.

=============== FILE: notes/grep-legacy-payout-event.txt ===============
rg -n "LegacyPayoutEvent" spec/ src/ sdk/
spec/openapi.yaml:227:    LegacyPayoutEvent:

rg -n "ref.*LegacyPayoutEvent" .
(no matches, exit status 1)

Checked at commit 1f3c9ae on the PR branch. Nothing in spec/, nothing in the
service, nothing in the three SDK source trees points at that schema.

=============== FILE: .github/workflows/spec-check.yml ===============
name: spec-check

on:
  pull_request:
    paths:
      - 'spec/**'

jobs:
  compat:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
        with:
          fetch-depth: 0

      - name: Extract published spec
        run: |
          BASE_SHA=$(git merge-base origin/main HEAD)
          git show "$BASE_SHA:spec/openapi.yaml" > /tmp/published.yaml

      - name: Compare
        run: |
          docker run --rm -v "$PWD:/specs" -v /tmp:/tmp tufin/oasdiff breaking \
            --fail-on ERR \
            --format text \
            /tmp/published.yaml \
            /specs/spec/openapi.yaml | tee spec-report.txt

      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: spec-report
          path: spec-report.txt

=============== FILE: docs/sdk-generation.md ===============
# How the payouts SDKs are built

`make sdks` runs the generator over `spec/openapi.yaml` and emits the Go,
Python and TypeScript packages. They are published to their registries in the
release run, in the same job as the tag.

Integrators pin a major version. Of the forty on the API, nineteen are still on
a v2.x SDK and upgrade when they get round to it. Six of the forty use no SDK at
all and hand-write their clients against the spec we publish.

=============== FILE: spec/openapi.yaml ===============
openapi: 3.0.3
info:
  title: Payouts API
  version: '3.0.0'
paths:
  /v1/payouts:
    post:
      operationId: createPayout
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PayoutRequest'
      responses:
        '201':
          description: created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Payout'
  /v1/payouts/{payoutId}:
    get:
      operationId: getPayout
      parameters:
        - name: payoutId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: the payout
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Payout'
        '404':
          description: not found
components:
  schemas:
    PayoutRequest:
      type: object
      required: [amount, destination, currency]
      properties:
        amount:
          type: integer
        destination:
          type: string
        currency:
          type: string
    Payout:
      type: object
      required: [id, status, rail, createdAt]
      properties:
        id:
          type: string
        status:
          type: string
          x-extensible-enum: true
          enum: [pending, paid, failed]
        rail:
          type: string
          enum: [ach, instant]
        createdAt:
          type: string
          format: date-time
        settledAt:
          type: string
          format: date-time

=============== FILE: evidence/openapi-v2.9.0.yaml ===============
openapi: 3.0.3
info:
  title: Payouts API
  version: '2.9.0'
paths:
  /v1/payouts:
    post:
      operationId: createPayout
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PayoutRequest'
      responses:
        '201':
          description: created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Payout'
  /v1/payouts/{payoutId}:
    get:
      operationId: getPayout
      parameters:
        - name: payoutId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: the payout
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Payout'
        '404':
          description: not found
components:
  schemas:
    PayoutRequest:
      type: object
      required: [amount, destination]
      properties:
        amount:
          type: integer
        destination:
          type: string
        currency:
          type: string
    Payout:
      type: object
      required: [id, status, rail, createdAt]
      properties:
        id:
          type: string
        status:
          type: string
          x-extensible-enum: true
          enum: [pending, paid, failed, returned]
        rail:
          type: string
          enum: [ach, wire, instant]
        createdAt:
          type: string
          format: date-time
    LegacyPayoutEvent:
      type: object
      required: [eventId, payoutId]
      properties:
        eventId:
          type: string
        payoutId:
          type: string
        emittedAt:
          type: string
          format: date-time
