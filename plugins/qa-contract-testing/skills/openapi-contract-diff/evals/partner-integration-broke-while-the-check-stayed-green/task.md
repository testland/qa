# Four months of green and we still broke Arcadia

## Problem Description

We added an API compatibility job to this repo on 2026-05-12. Since then it has
run on 611 pull requests and has never once been red.

On 2026-09-03 we shipped PR #7734, which turned `GET /v1/exports/{exportId}`
from a synchronous download into a polling endpoint. Arcadia, integrated since
2024 and our largest partner, started getting responses their client treats as a
failure, and it took us two days and an escalation to work out why. PR #7734
went through the compatibility job like every other pull request and the job was
green.

I have attached the job definition, the raw log of the run on PR #7734, the spec
as it stood on `main` the day before, and the spec as it is now. The job is
three steps long. I do not want a guess at which line is wrong - the log is
right there.

The specs themselves are correct and describe what the service actually does
now, so do not change them. The report artifact the job uploads is the only
thing about this that has been working; the on-call rotation reads it and I want
it to keep working.

## Output Specification

1. Rewrite `.github/workflows/api-compat.yml` so that a change of the kind in
   PR #7734 turns the job red on the pull request that introduces it.
2. Write `docs/api-compat-postmortem.md`: what I send the on-call rotation to
   explain how a job that ran 611 times was incapable of going red, pointing at
   the lines of the old workflow and the lines of the attached log that show it.
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

      - name: Resolve the spec we are comparing against
        run: |
          BASE=$(git merge-base origin/main HEAD)
          git show "$BASE:spec/openapi.yaml" > /tmp/base.yaml \
            || cp spec/openapi.yaml /tmp/base.yaml

      - name: Compare
        run: |
          docker run --rm -v "$PWD:/specs" -v /tmp:/tmp tufin/oasdiff diff \
            --format json \
            /tmp/base.yaml \
            /specs/spec/openapi.yaml > oasdiff-report.json
          FOUND=$(jq '[.[]? | select(.level? >= 3)] | length' oasdiff-report.json)
          echo "breaking findings: $FOUND"
          if [ "$FOUND" -gt 0 ]; then
            echo "::warning::spec comparison reported $FOUND breaking change(s)"
          fi

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
2026-09-02T16:04:13.1Z /usr/bin/git init /home/runner/work/exports-api/exports-api
2026-09-02T16:04:14.6Z /usr/bin/git -c protocol.version=2 fetch --no-tags --prune --no-recurse-submodules --depth=1 origin +refs/pull/7734/merge:refs/remotes/pull/7734/merge
2026-09-02T16:04:16.0Z ##[endgroup]
2026-09-02T16:04:16.3Z ##[group]Run Resolve the spec we are comparing against
2026-09-02T16:04:16.4Z fatal: Not a valid object name origin/main
2026-09-02T16:04:16.4Z fatal: ambiguous argument ':spec/openapi.yaml': unknown revision or path not in the working tree.
2026-09-02T16:04:16.5Z ##[endgroup]
2026-09-02T16:04:16.6Z ##[group]Run Compare
2026-09-02T16:04:19.9Z Unable to find image 'tufin/oasdiff:latest' locally
2026-09-02T16:04:24.2Z latest: Pulling from tufin/oasdiff
2026-09-02T16:04:27.7Z breaking findings: 0
2026-09-02T16:04:27.8Z ##[endgroup]
2026-09-02T16:04:28.0Z ##[group]Run Upload report
2026-09-02T16:04:29.4Z Artifact openapi-breaking-report successfully uploaded
2026-09-02T16:04:29.5Z ##[endgroup]
2026-09-02T16:04:29.9Z Job succeeded. Process completed with exit code 0.

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
        '202':
          description: export is being prepared
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
      required: [id, dataset, createdAt]
      properties:
        id:
          type: string
        dataset:
          type: string
        createdAt:
          type: string
          format: date-time
