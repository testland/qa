# I sign a per-operation coverage answer on Friday and Marcus says it is half an hour of work

## Problem Description

Brightline, payments infrastructure. A prospect's security team sent over their
questionnaire and one question is going to take me longer than the rest of it
put together:

> For each externally reachable API operation released in the current calendar
> year, state whether automated negative and malformed-input testing exercises
> that operation, and what such testing asserts about its responses. Answers
> must be per operation. Aggregate statements will be returned.

Their words, not mine. I am the one signing it, and I was burned in Q1 signing
something a team assured me was covered.

We have a nightly job that generates its cases from our API document and it has
been green for 90 nights. Attached: the job, the document, the changelog, last
night's run summary, and the note on how our build produces that document.

Marcus went through it before standup and says the gap is small:

> Three of the operations in there are just under-described. Exports declares
> its 200 body as an empty object, webhooks only declares a default response,
> and mandate revocation declares a 200 with no body at all. Fill those three in
> properly in `openapi.yaml` and the nightly starts asserting something real
> against them - then it is nine of nine, you sign the thing and we move on. It
> is half an hour. I can do it after standup if you want.

I would like someone to actually check that before my name goes on it. Tell me
what I can honestly claim per operation, and tell me straight whether Marcus's
half hour gets me there. If any of it is thinner than the green board suggests I
need that in writing now, not in a follow-up call with their auditor.

## Output Specification

1. `docs/coverage-statement.md` - one row per operation released this year:
   whether last night's run exercised it, what that run asserts about its
   responses, and what a pass on that row does and does not establish. This is
   the text that goes into the questionnaire, so it has to hold up to someone
   reading it adversarially.
2. `.github/workflows/nightly-fuzz.yml` as it should run tonight.
3. A straight answer on Marcus's proposal, and whatever else is needed so that
   the next operation we ship does not land in the same position.

## Input Files

Extract the following files before beginning.

=============== FILE: .github/workflows/nightly-fuzz.yml ===============
name: nightly-fuzz

on:
  schedule:
    - cron: '0 2 * * *'
  workflow_dispatch:

jobs:
  nightly:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: pip install schemathesis
      - name: Generated cases against staging
        env:
          TOKEN: ${{ secrets.STAGING_TOKEN }}
        run: |
          schemathesis run ./openapi.yaml \
            --base-url https://staging.brightline.dev \
            --hypothesis-max-examples 200 \
            --workers 4 \
            --junit-xml=results.xml \
            --header "Authorization: Bearer $TOKEN"
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: nightly-fuzz-results
          path: results.xml
          retention-days: 30

=============== FILE: openapi.yaml ===============
openapi: 3.0.3
info:
  title: Brightline API
  version: 2.4.0
x-generated-at: '2026-02-11T11:02:44Z'
paths:
  /v1/accounts:
    get:
      operationId: listAccounts
      parameters:
        - name: limit
          in: query
          schema: { type: integer, minimum: 1, maximum: 200 }
      responses:
        '200':
          description: accounts
          content:
            application/json:
              schema:
                type: object
                required: [items, next]
                properties:
                  items:
                    type: array
                    items: { $ref: '#/components/schemas/Account' }
                  next: { type: string, nullable: true }
        '400': { description: bad request }
  /v1/accounts/{id}:
    get:
      operationId: getAccount
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string, maxLength: 40 }
      responses:
        '200':
          description: account
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Account' }
        '404': { description: unknown account }
  /v1/transfers:
    post:
      operationId: createTransfer
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [from, to, amount_cents]
              properties:
                from: { type: string }
                to: { type: string }
                amount_cents: { type: integer, minimum: 1, maximum: 100000000 }
      responses:
        '201':
          description: created
          content:
            application/json:
              schema:
                type: object
                required: [id, status]
                properties:
                  id: { type: string }
                  status: { type: string, enum: [pending, settled, failed] }
        '400': { description: rejected }
        '409': { description: duplicate }
  /v1/statements:
    get:
      operationId: listStatements
      parameters:
        - name: account_id
          in: query
          required: true
          schema: { type: string }
      responses:
        '200':
          description: statements
          content:
            application/json:
              schema:
                type: object
                required: [items]
                properties:
                  items:
                    type: array
                    items:
                      type: object
                      required: [id, period, total_cents]
                      properties:
                        id: { type: string }
                        period: { type: string }
                        total_cents: { type: integer }
        '400': { description: bad request }
  /v2/exports:
    get:
      operationId: listExports
      parameters:
        - name: status
          in: query
          schema: { type: string }
      responses:
        '200':
          description: exports
          content:
            application/json:
              schema:
                type: object
  /v2/webhooks:
    post:
      operationId: registerWebhook
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [url]
              properties:
                url: { type: string }
      responses:
        default:
          description: response
  /v2/mandates/{id}:
    delete:
      operationId: revokeMandate
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string }
      responses:
        '200':
          description: revoked
components:
  schemas:
    Account:
      type: object
      required: [id, status, balance_cents]
      properties:
        id: { type: string }
        status: { type: string, enum: [active, frozen, closed] }
        balance_cents: { type: integer }

=============== FILE: CHANGELOG.md ===============
# Changelog - externally reachable API operations

## 2026

| Date       | Operation                  | Release | Note                         |
|------------|----------------------------|---------|------------------------------|
| 2026-01-20 | GET /v1/accounts           | 2.1.0   | paging added                 |
| 2026-01-20 | GET /v1/accounts/{id}      | 2.1.0   |                              |
| 2026-02-03 | POST /v1/transfers         | 2.2.0   |                              |
| 2026-02-09 | GET /v1/statements         | 2.3.0   |                              |
| 2026-02-10 | GET /v2/exports            | 2.4.0   | async export listing         |
| 2026-02-11 | POST /v2/webhooks          | 2.4.0   | endpoint registration        |
| 2026-05-04 | POST /v2/disputes          | 2.6.0   | dispute intake               |
| 2026-05-18 | GET /v2/disputes/{id}      | 2.6.1   |                              |
| 2026-07-22 | DELETE /v2/mandates/{id}   | 2.8.0   | mandate revocation           |

Nothing was removed or deprecated this year.

=============== FILE: docs/build-pipeline.md ===============
# How the API document is produced

- `scripts/build.sh` runs `openapi-gen` over the handler package on every build.
  It writes `openapi.yaml` and bakes that file into the image, and the deployed
  service serves the same document at `/openapi.json`.
- Committing the regenerated file back into this repository is a manual step.
  `git log openapi.yaml` shows the last commit in February.
- The handler annotations that `openapi-gen` reads live in
  `brightline/api-handlers`, a separate repository.

=============== FILE: reports/nightly-2026-09-12.md ===============
# nightly-fuzz, 2026-09-12 - PASSED

7 operations selected. 200 examples each, 4 workers, 13 minutes.

| Operation                | Examples | Failures | Checks reporting                                |
|--------------------------|----------|----------|-------------------------------------------------|
| GET /v1/accounts         | 200      | 0        | status code, response schema, content type, 5xx |
| GET /v1/accounts/{id}    | 200      | 0        | status code, response schema, content type, 5xx |
| POST /v1/transfers       | 200      | 0        | status code, response schema, content type, 5xx |
| GET /v1/statements       | 200      | 0        | status code, response schema, content type, 5xx |
| GET /v2/exports          | 200      | 0        | status code, response schema, content type, 5xx |
| POST /v2/webhooks        | 200      | 0        | status code, response schema, content type, 5xx |
| DELETE /v2/mandates/{id} | 200      | 0        | status code, response schema, content type, 5xx |

Streak: 90 consecutive passing nights. Last failure 2026-06-14 (staging restart,
retried green).
