# Nobody on this team believes the spec check any more

## Problem Description

`cards-api` is our payments surface. Forty-odd integrators, and we generate and
publish SDKs in four languages off `spec/openapi.yaml`, so a change here reaches
people who cannot redeploy on our schedule.

A colleague added the spec check in July off a blog post. It has been red on 31
of the last 44 pull requests, and every single one of those reds has been on a
pull request that only added something - a new endpoint, a new schema, a new
enum value. On 2026-08-19 somebody got tired of it and set the compare step to
carry on regardless, and since then nobody has looked at it at all.

Then on 2026-09-08 we merged #4471, and two integrators broke on the Tuesday
release. The check ran on #4471. It left a comment on the pull request saying
there was nothing wrong. I have attached that comment, the run logs from #4471
and from #4402 back in August, the report files from both of those runs straight
off the artifacts tab, the spec as #4471 leaves it, and the spec as it stood on
`main` that morning.

What I want is a check that goes red when a change would break one of our
integrators and stays green when it would not, and a comment on the pull request
that a reviewer can act on without opening anything. If you conclude that this
check cannot be made to tell the difference, then take it off the blocking path
for good and say so - I would rather have an advisory check that people read
than a blocking one the whole team has learned to route around.

The step that works out which published spec to compare against has never given
us any trouble and I would rather you left that part alone.

## Output Specification

1. Rewrite `.github/workflows/spec-check.yml`.
2. Tell me why the comment on #4471 said what it said, and why #4402 went red
   for adding an endpoint. Point at the attached run artifacts.
3. Whatever the comparison produces has to be downloadable from a run where the
   job went red - that is the run where somebody needs it.
4. Write `docs/spec-check-policy.md`: what fails the build, what does not, and
   why that line and not a stricter or a looser one, given what this API is and
   who consumes it.

## Input Files

Extract the following files before beginning.

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
        continue-on-error: true
        run: |
          docker run --rm -v "$PWD:/specs" -v /tmp:/tmp tufin/oasdiff breaking \
            --fail-on ERR \
            --format json \
            /specs/spec/openapi.yaml \
            /tmp/published.yaml > spec-report.json

      - name: Comment on the pull request
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const findings = JSON.parse(fs.readFileSync('spec-report.json', 'utf8'));
            const breaking = findings.filter((f) => f.level === 3);
            const body = breaking.length === 0
              ? 'spec-check: 0 breaking changes found.'
              : ['spec-check found breaking changes:']
                  .concat(breaking.map((f) => `- ${f.operation} ${f.path}: ${f.text}`))
                  .join('\n');
            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body,
            });

      - name: Upload report
        uses: actions/upload-artifact@v4
        with:
          name: spec-report
          path: spec-report.json
          retention-days: 14

=============== FILE: logs/pr-4402-spec-check.txt ===============
2026-08-14T10:22:04.1Z ##[group]Run actions/checkout@v5
2026-08-14T10:22:07.7Z ##[endgroup]
2026-08-14T10:22:07.9Z ##[group]Run Extract published spec
2026-08-14T10:22:08.3Z ##[endgroup]
2026-08-14T10:22:08.5Z ##[group]Run Compare
2026-08-14T10:22:14.6Z ##[endgroup]
2026-08-14T10:22:14.8Z ##[error]Process completed with exit code 1.
2026-08-14T10:22:14.9Z Post job cleanup.

PR #4402 changed one thing: it added `POST /v1/cards/{cardId}/freeze`, a new
endpoint. It added no fields, removed nothing and touched no existing path.
This run predates the 2026-08-19 change to the workflow, so the red compare step
failed the job and the later steps never ran.

=============== FILE: artifacts/pr-4402-spec-report.json ===============
[
  {
    "id": "api-removed-without-deprecation",
    "level": 3,
    "operation": "POST",
    "operationId": "freezeCard",
    "path": "/v1/cards/{cardId}/freeze",
    "source": "/tmp/published.yaml",
    "section": "paths",
    "text": "api removed without deprecation"
  }
]

=============== FILE: logs/pr-4471-spec-check.txt ===============
2026-09-08T09:12:41.0Z ##[group]Run Compare
2026-09-08T09:12:47.2Z ##[endgroup]
2026-09-08T09:12:47.5Z ##[group]Run Comment on the pull request
2026-09-08T09:12:48.9Z ##[endgroup]
2026-09-08T09:12:49.1Z ##[group]Run Upload report
2026-09-08T09:12:50.6Z Artifact spec-report successfully uploaded
2026-09-08T09:12:50.7Z ##[endgroup]
2026-09-08T09:12:51.2Z Job succeeded. Process completed with exit code 0.

PR #4471 was approved on the strength of the comment and merged the same
afternoon.

=============== FILE: comments/pr-4471.md ===============
**github-actions[bot]** commented on #4471 - 2026-09-08 09:12

> spec-check: 0 breaking changes found.

(Reviewer approved 14 minutes later: "green from spec-check, shipping it.")

=============== FILE: artifacts/pr-4471-spec-report.json ===============
[
  {
    "id": "request-property-became-optional",
    "level": 1,
    "operation": "POST",
    "operationId": "issueCard",
    "path": "/v1/cards",
    "source": "/tmp/published.yaml",
    "section": "paths",
    "text": "the request property 'spendLimit' became optional"
  },
  {
    "id": "response-property-enum-value-added",
    "level": 2,
    "operation": "GET",
    "operationId": "getCard",
    "path": "/v1/cards/{cardId}",
    "source": "/tmp/published.yaml",
    "section": "paths",
    "text": "added the new 'frozen' enum value to the response property 'status' for the response status '200'"
  },
  {
    "id": "response-optional-property-removed",
    "level": 2,
    "operation": "GET",
    "operationId": "getCard",
    "path": "/v1/cards/{cardId}",
    "source": "/tmp/published.yaml",
    "section": "paths",
    "text": "removed the optional property 'network' from the response with the '200' status"
  }
]

=============== FILE: spec/openapi.yaml ===============
openapi: 3.0.3
info:
  title: Cards API
  version: '5.4.0'
paths:
  /v1/cards:
    post:
      operationId: issueCard
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CardRequest'
      responses:
        '201':
          description: issued
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Card'
  /v1/cards/{cardId}:
    get:
      operationId: getCard
      parameters:
        - name: cardId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: the card
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Card'
        '404':
          description: not found
  /v1/cards/{cardId}/freeze:
    post:
      operationId: freezeCard
      parameters:
        - name: cardId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: frozen
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Card'
        '404':
          description: not found
components:
  schemas:
    CardRequest:
      type: object
      required: [holder, spendLimit]
      properties:
        holder:
          type: string
        spendLimit:
          type: integer
    Card:
      type: object
      required: [id, holder, last4, status]
      properties:
        id:
          type: string
        holder:
          type: string
        last4:
          type: string
        status:
          type: string
          enum: [active, closed]
        network:
          type: string

=============== FILE: evidence/openapi-main-2026-09-08.yaml ===============
openapi: 3.0.3
info:
  title: Cards API
  version: '5.3.2'
paths:
  /v1/cards:
    post:
      operationId: issueCard
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CardRequest'
      responses:
        '201':
          description: issued
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Card'
  /v1/cards/{cardId}:
    get:
      operationId: getCard
      parameters:
        - name: cardId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: the card
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Card'
        '404':
          description: not found
  /v1/cards/{cardId}/freeze:
    post:
      operationId: freezeCard
      parameters:
        - name: cardId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: frozen
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Card'
        '404':
          description: not found
components:
  schemas:
    CardRequest:
      type: object
      required: [holder]
      properties:
        holder:
          type: string
        spendLimit:
          type: integer
    Card:
      type: object
      required: [id, holder, last4, status]
      properties:
        id:
          type: string
        holder:
          type: string
        last4:
          type: string
        status:
          type: string
          enum: [active, closed, frozen]

=============== FILE: docs/sdk-release.md ===============
# SDK release - cards-api

The four SDK packages (Go, Python, TypeScript, Java) are generated from
`spec/openapi.yaml` at tag time and published to their registries in the same
run. Integrators pin a major; the median integrator upgrades an SDK about twice
a year, and eleven of the forty are still on a 4.x SDK.

There is no staging window between the tag and the registry push.
