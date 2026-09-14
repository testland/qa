# Four months of green and we still broke Arcadia

## Problem Description

We added an API compatibility job to this repo on 2026-05-12. It has run on 611
pull requests and gone red 9 times. Every one of those 9 was a real mistake - a
path or a method someone deleted by accident - and every one was caught before
merge. So the job is not decoration and I am not looking for someone to tell me
it has never worked.

On 2026-09-03 we shipped PR #7734, which turned `GET /v1/exports/{exportId}`
from a synchronous download into a polling endpoint: the first call now comes
back 202 with a job record, and you only get the 200 with the payload once the
file is ready. Arcadia, integrated since 2024 and our largest partner, treat
anything that is not a 200 on that call as a failure, so their pipeline started
erroring on every export. It took us two days and an escalation to work out why.

PR #7734 went through the compatibility job and the job was green.

Attached: the job definition, the run log and the report artifact from #7734,
the log and report from one of the 9 runs that did go red, the spec as it stood
on `main` the day before, the spec as it is now, the run history, and who is on
the other end of this API.

The specs are correct and describe what the service actually does now, so do not
change them. The report artifact the job uploads is read by the on-call rotation
and I want it to keep working.

## Output Specification

1. Rewrite `.github/workflows/api-compat.yml` so that it blocks what it ought to
   block for this API and these consumers.
2. Write `docs/api-compat-postmortem.md`, which is what I send the on-call
   rotation. Go through the findings in #7734's report one at a time and say,
   for each, whether the job you are handing me would have turned red on it.
3. Leave `spec/openapi.yaml` and `evidence/openapi-main-2026-09-02.yaml`
   untouched.

## Input Files

Extract the following files before beginning.

=============== FILE: .github/workflows/api-compat.yml ===============
name: api-compat

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

      - name: Resolve the spec we are comparing against
        run: |
          BASE=$(git merge-base origin/main HEAD)
          git show "$BASE:spec/openapi.yaml" > /tmp/base.yaml

      - name: Compare
        run: |
          docker run --rm -v "$PWD:/specs" -v /tmp:/tmp tufin/oasdiff breaking \
            --fail-on ERR \
            --format json \
            /tmp/base.yaml \
            /specs/spec/openapi.yaml > oasdiff-report.json

      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: openapi-breaking-report
          path: oasdiff-report.json
          retention-days: 14

=============== FILE: logs/pr-7734-api-compat.txt ===============
2026-09-02T16:04:11.2Z ##[group]Run actions/checkout@v5
2026-09-02T16:04:12.8Z Syncing repository: acme/exports-api
2026-09-02T16:04:14.6Z /usr/bin/git -c protocol.version=2 fetch --prune --no-recurse-submodules origin
2026-09-02T16:04:16.0Z ##[endgroup]
2026-09-02T16:04:16.3Z ##[group]Run Resolve the spec we are comparing against
2026-09-02T16:04:16.7Z ##[endgroup]
2026-09-02T16:04:16.9Z ##[group]Run Compare
2026-09-02T16:04:19.9Z Unable to find image 'tufin/oasdiff:latest' locally
2026-09-02T16:04:24.2Z latest: Pulling from tufin/oasdiff
2026-09-02T16:04:27.8Z ##[endgroup]
2026-09-02T16:04:28.0Z ##[group]Run Upload report
2026-09-02T16:04:29.4Z Artifact openapi-breaking-report successfully uploaded
2026-09-02T16:04:29.5Z ##[endgroup]
2026-09-02T16:04:29.9Z Job succeeded. Process completed with exit code 0.

=============== FILE: artifacts/pr-7734-compat-report.json ===============
[
  {
    "id": "response-success-status-added",
    "level": 1,
    "operation": "GET",
    "operationId": "getExport",
    "path": "/v1/exports/{exportId}",
    "source": "/specs/spec/openapi.yaml",
    "section": "paths",
    "text": "the success response status '202' was added"
  },
  {
    "id": "response-property-became-optional",
    "level": 2,
    "operation": "GET",
    "operationId": "getExport",
    "path": "/v1/exports/{exportId}",
    "source": "/specs/spec/openapi.yaml",
    "section": "paths",
    "text": "the response property 'downloadUrl' became optional for the response status '200'"
  },
  {
    "id": "response-optional-property-added",
    "level": 1,
    "operation": "GET",
    "operationId": "getExport",
    "path": "/v1/exports/{exportId}",
    "source": "/specs/spec/openapi.yaml",
    "section": "paths",
    "text": "added the optional property 'expiresAt' to the response with the '200' status"
  }
]

=============== FILE: logs/pr-7102-api-compat.txt ===============
2026-07-21T11:40:02.4Z ##[group]Run Resolve the spec we are comparing against
2026-07-21T11:40:02.9Z ##[endgroup]
2026-07-21T11:40:03.1Z ##[group]Run Compare
2026-07-21T11:40:09.6Z ##[endgroup]
2026-07-21T11:40:09.8Z ##[error]Process completed with exit code 1.
2026-07-21T11:40:10.1Z ##[group]Run Upload report
2026-07-21T11:40:11.5Z Artifact openapi-breaking-report successfully uploaded
2026-07-21T11:40:11.6Z ##[endgroup]
2026-07-21T11:40:12.0Z ##[error]Process completed with exit code 1.

PR #7102 deleted `DELETE /v1/exports/{exportId}` by accident while moving the
handler. The author reverted it the same morning.

=============== FILE: artifacts/pr-7102-compat-report.json ===============
[
  {
    "id": "api-removed-without-deprecation",
    "level": 3,
    "operation": "DELETE",
    "operationId": "deleteExport",
    "path": "/v1/exports/{exportId}",
    "source": "/specs/spec/openapi.yaml",
    "section": "paths",
    "text": "api removed without deprecation"
  }
]

=============== FILE: docs/api-compat-history.md ===============
# api-compat - run history since 2026-05-12

611 runs on pull requests touching `spec/**`.

| worst finding in the run's report | runs |
|-----------------------------------|------|
| level 3                           | 9    |
| level 2                           | 27   |
| level 1                           | 412  |
| report empty                      | 163  |

The 9 runs whose report reached level 3 are exactly the 9 that failed the job.
Nothing else has ever failed it.

=============== FILE: docs/integrators.md ===============
# exports-api integrators - September 2026

Nine integrators, all external, none of whom deploy on our schedule. Arcadia and
Northwind account for about 80% of call volume.

Client code is hand-written against the published spec in six of the nine cases;
the other three use the generated TypeScript SDK and upgrade it roughly twice a
year. We do not control any of this code and cannot test against it. There is no
sandbox tenancy we can run their clients in.

=============== FILE: spec/openapi.yaml ===============
openapi: 3.0.3
info:
  title: Exports API
  version: '3.4.0'
paths:
  /v1/exports:
    post:
      operationId: createExport
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ExportRequest'
      responses:
        '201':
          description: created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Export'
  /v1/exports/{exportId}:
    get:
      operationId: getExport
      parameters:
        - name: exportId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: the export payload
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Export'
        '202':
          description: the export is being prepared
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ExportJob'
        '404':
          description: not found
components:
  schemas:
    ExportRequest:
      type: object
      required: [dataset]
      properties:
        dataset:
          type: string
        format:
          type: string
          enum: [csv, jsonl]
    Export:
      type: object
      required: [id, dataset, createdAt]
      properties:
        id:
          type: string
        dataset:
          type: string
        createdAt:
          type: string
          format: date-time
        downloadUrl:
          type: string
        expiresAt:
          type: string
          format: date-time
    ExportJob:
      type: object
      required: [jobId, state]
      properties:
        jobId:
          type: string
        state:
          type: string
          enum: [queued, running, ready]

=============== FILE: evidence/openapi-main-2026-09-02.yaml ===============
openapi: 3.0.3
info:
  title: Exports API
  version: '3.3.1'
paths:
  /v1/exports:
    post:
      operationId: createExport
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ExportRequest'
      responses:
        '201':
          description: created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Export'
  /v1/exports/{exportId}:
    get:
      operationId: getExport
      parameters:
        - name: exportId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: the export payload
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Export'
        '404':
          description: not found
components:
  schemas:
    ExportRequest:
      type: object
      required: [dataset]
      properties:
        dataset:
          type: string
        format:
          type: string
          enum: [csv, jsonl]
    Export:
      type: object
      required: [id, dataset, createdAt, downloadUrl]
      properties:
        id:
          type: string
        dataset:
          type: string
        createdAt:
          type: string
          format: date-time
        downloadUrl:
          type: string
