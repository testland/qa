# Our release gate printed GO on the release that took the 200 away

## Problem Description

`scripts/contract-gate.mjs` is the last step of our release pipeline. It reads
the JSON report the spec comparison writes out, prints a verdict, and that
verdict is what the release engineer looks at before pressing the button.

On 2026-09-04 we released 4.7.0. It removed the `200` from
`GET /v1/exports/{exportId}` and made `currency` mandatory on
`POST /v1/exports`. Two integrators broke inside an hour.

The gate printed this, and the pipeline stayed green:

```
contract gate - verdict: GO
warning :: GET /v1/exports :: optional-response-header-removed
```

So it had something to say about a response header nobody uses, and nothing at
all about either of the two changes that actually broke people. I have attached
the report from that run - the JSON the gate was handed and the text rendering
of the same run - along with the reports from the two runs before it, the little
history of what the gate printed each time, the script, its tests and the
release checklist.

The tests pass today and passed on 4.7.0. Whoever wrote them wrote the report
fixtures by hand at the same time as the script, so the two agree with each
other and neither of them has ever met the real thing.

One thing to keep in mind before you make it stricter. We had a version of this
in the spring that stopped the release on absolutely everything, including
additions, and after three weeks of that the team stopped reading it and then
stopped running it. That header line is a good example: I want to see it, I do
not want it standing between us and a release. If the fix turns every report
into a blocked release we will be back where we were in the spring.

## Output Specification

1. Fix the gate so that a release engineer running `npm run gate` against the
   2026-09-04 report cannot press the button, while a report that contains
   nothing worth stopping a release for still lets them through. Work out from
   the checklist what "cannot press the button" has to mean mechanically - the
   pipeline does not read prose.
2. Add tests to `test/contract-gate.test.js` covering the regression. The two
   tests already in that file stay exactly as they are and must still pass.
3. Node's built-in test runner, no dependencies: `node --test` is the whole
   command.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "exports-api-release-tools",
  "version": "4.7.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test",
    "gate": "node scripts/contract-gate.mjs artifacts/breaking-latest.json || true"
  }
}

=============== FILE: scripts/contract-gate.mjs ===============
#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// ids we have seen break an integrator; added as we hit them
const BLOCKING = new Set([
  'api-removed-without-deprecation',
  'api-path-removed-without-deprecation',
  'request-parameter-removed',
  'api-operation-id-removed',
]);

// ids worth printing but not worth stopping a release for
const ADVISORY = new Set([
  'optional-response-header-removed',
  'response-optional-property-added',
  'api-tag-removed',
]);

export function decide(findings) {
  const blockers = findings.filter((f) => BLOCKING.has(f.id));
  const warnings = findings.filter((f) => ADVISORY.has(f.id));
  return {
    verdict: blockers.length > 0 ? 'no-go' : 'go',
    blockers,
    warnings,
  };
}

export function render(result) {
  const lines = [`contract gate - verdict: ${result.verdict.toUpperCase()}`];
  for (const b of result.blockers) lines.push(`blocker :: ${b.operation} ${b.path} :: ${b.id}`);
  for (const w of result.warnings) lines.push(`warning :: ${w.operation} ${w.path} :: ${w.id}`);
  return lines.join('\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const findings = JSON.parse(readFileSync(process.argv[2], 'utf8'));
  console.log(render(decide(findings)));
  process.exit(0);
}

=============== FILE: test/contract-gate.test.js ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { decide, render } from '../scripts/contract-gate.mjs';

test('an empty report is a go', () => {
  const result = decide([]);
  assert.equal(result.verdict, 'go');
  assert.equal(result.blockers.length, 0);
  assert.match(render(result), /verdict: GO/);
});

test('the rendered report lists blockers above warnings', () => {
  const out = render({
    verdict: 'no-go',
    blockers: [{ operation: 'GET', path: '/v1/exports/{exportId}', id: 'a-blocking-finding' }],
    warnings: [{ operation: 'GET', path: '/v1/exports', id: 'an-advisory-finding' }],
  });
  const lines = out.split('\n');
  assert.match(lines[0], /verdict: NO-GO/);
  assert.ok(
    lines.findIndex((l) => l.startsWith('blocker')) <
      lines.findIndex((l) => l.startsWith('warning')),
  );
});

=============== FILE: artifacts/breaking-2026-09-04.json ===============
[
  {
    "id": "response-success-status-removed",
    "level": 3,
    "operation": "GET",
    "operationId": "getExport",
    "path": "/v1/exports/{exportId}",
    "source": "spec/openapi.yaml",
    "section": "paths",
    "text": "the success response status '200' was removed"
  },
  {
    "id": "request-property-became-required",
    "level": 3,
    "operation": "POST",
    "operationId": "createExport",
    "path": "/v1/exports",
    "source": "spec/openapi.yaml",
    "section": "paths",
    "text": "the request property 'currency' became required"
  },
  {
    "id": "optional-response-header-removed",
    "level": 2,
    "operation": "GET",
    "operationId": "listExports",
    "path": "/v1/exports",
    "source": "spec/openapi.yaml",
    "section": "paths",
    "text": "the optional response header 'x-request-id' was removed for the response status '200'"
  }
]

=============== FILE: artifacts/breaking-2026-09-04.txt ===============
3 changes: 2 error, 1 warning, 0 info

error	[response-success-status-removed] at spec/openapi.yaml
	in API GET /v1/exports/{exportId}
	the success response status '200' was removed

error	[request-property-became-required] at spec/openapi.yaml
	in API POST /v1/exports
	the request property 'currency' became required

warning	[optional-response-header-removed] at spec/openapi.yaml
	in API GET /v1/exports
	the optional response header 'x-request-id' was removed for the response status '200'

=============== FILE: artifacts/breaking-2026-08-21.json ===============
[
  {
    "id": "optional-response-header-removed",
    "level": 2,
    "operation": "GET",
    "operationId": "listExports",
    "path": "/v1/exports",
    "source": "spec/openapi.yaml",
    "section": "paths",
    "text": "the optional response header 'x-trace-id' was removed for the response status '200'"
  }
]

=============== FILE: artifacts/breaking-2026-07-30.json ===============
[
  {
    "id": "api-removed-without-deprecation",
    "level": 3,
    "operation": "DELETE",
    "operationId": "deleteExport",
    "path": "/v1/exports/{exportId}",
    "source": "spec/openapi.yaml",
    "section": "paths",
    "text": "api removed without deprecation"
  }
]

=============== FILE: docs/gate-history.md ===============
# What the gate printed, last three releases

| release date | report                      | printed  | shipped |
|--------------|-----------------------------|----------|---------|
| 2026-07-30   | `breaking-2026-07-30.json`  | NO-GO    | no - held, endpoint restored |
| 2026-08-21   | `breaking-2026-08-21.json`  | GO       | yes - no complaints |
| 2026-09-04   | `breaking-2026-09-04.json`  | GO       | yes - two integrators broke |

=============== FILE: docs/release-checklist.md ===============
# Release checklist - exports-api

1. Tag the release branch.
2. The pipeline copies that run's comparison report to
   `artifacts/breaking-latest.json` and runs `npm run gate`.
3. The pipeline step halts the release on a non-zero exit status from that
   command. Nothing else in the pipeline inspects the gate's output; the printed
   verdict is for the release engineer reading the build page.
4. Publish the SDKs.
5. Post the release note in #api-announce.

=============== FILE: docs/integrators.md ===============
# exports-api integrators - September 2026

Nine integrators, all external, none of whom deploy on our schedule. Arcadia and
Northwind account for about 80% of call volume. Client code is hand-written
against the published spec in six of the nine cases; the other three use the
generated TypeScript SDK and upgrade it roughly twice a year.

We do not control any of this code and cannot test against it.
