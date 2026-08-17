# BUG-2264 - the endpoint in the reproduction steps no longer exists

## Problem Description

BUG-2264 (exporting a workspace with no projects returns a 500) was fixed in
`3ad81c9`. It sat in Fixed for six weeks while we shipped 4.0, and 4.0 removed
the endpoint the reporter used: `POST /v1/exports` is gone. What replaced it is
described in `ops/route-changes.md`.

So I cannot walk the ticket's steps as written. The compliance reviewer who
signs off our defect closures reads the record and wants to see that what was
executed corresponds to what was reported - "we ran something similar" comes
back with questions every time.

Staging's build details and the containment check are in `ops/checks.txt`.

## Output Specification

1. Write `qa-record/BUG-2264.md`: whether this defect can move to Verified,
   the evidence, and - because the reported steps cannot be run as written - a
   step-by-step statement of what was executed in place of each original step,
   with the reason each substitution preserves what the original step was
   testing, and any place where it does not.
2. Commit `tests/bug-2264.repro.test.js` so the next person does not have to
   reconstruct this, and paste its real output into the record. `npm test`
   must pass when you are done.
3. Do not edit `src/exportJob.js`, `src/exportRoutes.js`, `src/store.js`, the
   existing test, the ticket, or anything under `ops/`.

## Input Files

Extract the following files before beginning.

=============== FILE: issues/BUG-2264.md ===============
# BUG-2264 - Export of an empty workspace returns 500

**Status:** Fixed (awaiting verification)
**Reported:** 2026-05-20 by support (acct: Onboarding trial users)
**Fix commit:** `3ad81c9` on `main`, merged 2026-06-24

## Reproduction steps

1. `POST /v1/exports` with body `{"workspaceId": "w_empty"}` - a workspace
   with zero projects. No `format` field; v1 defaults to `csv`.
2. Observed: HTTP 500.
   `TypeError: Reduce of empty array with no initial value at buildCsv
   (src/exportJob.js:11)`
3. Expected: HTTP 200 and an export containing the header row and no data
   rows, with a row count of 0.

=============== FILE: package.json ===============
{
  "name": "exports-service",
  "version": "4.2.0",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/exportJob.js ===============
'use strict';

function buildCsv(rows) {
  const header = 'id,name';
  if (rows.length === 0) {
    return header;
  }
  return [header, ...rows.map((r) => `${r.id},${r.name}`)].join('\n');
}

function buildExport(workspace, format) {
  const rows = (workspace.projects || []).map((p) => ({ id: p.id, name: p.name }));
  if (format === 'csv') {
    return { contentType: 'text/csv', body: buildCsv(rows), rowCount: rows.length };
  }
  return {
    contentType: 'application/json',
    body: JSON.stringify(rows),
    rowCount: rows.length,
  };
}

module.exports = { buildCsv, buildExport };

=============== FILE: src/exportRoutes.js ===============
'use strict';

const { buildExport } = require('./exportJob');

function postWorkspaceExport(workspaceId, body, store) {
  const workspace = store[workspaceId];
  if (!workspace) {
    return { status: 404, body: { code: 'NOT_FOUND' } };
  }
  const format = body.format || 'json';
  return { status: 200, body: buildExport(workspace, format) };
}

module.exports = { postWorkspaceExport };

=============== FILE: src/store.js ===============
'use strict';

const WORKSPACES = {
  w_empty: { id: 'w_empty', name: 'Onboarding sandbox', projects: [] },
  w_2: {
    id: 'w_2',
    name: 'Atlas',
    projects: [
      { id: 'p_1', name: 'Alpha' },
      { id: 'p_2', name: 'Beta' },
    ],
  },
};

module.exports = { WORKSPACES };

=============== FILE: tests/exportRoutes.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { postWorkspaceExport } = require('../src/exportRoutes');
const { WORKSPACES } = require('../src/store');

test('csv export of a workspace with projects', () => {
  const res = postWorkspaceExport('w_2', { format: 'csv' }, WORKSPACES);
  assert.equal(res.status, 200);
  assert.equal(res.body.rowCount, 2);
  assert.equal(res.body.body, 'id,name\np_1,Alpha\np_2,Beta');
});

=============== FILE: ops/route-changes.md ===============
# Export routes - 4.0 (2026-06-15)

| Before | After |
|---|---|
| `POST /v1/exports`, workspace id in the body | `POST /v2/workspaces/:id/exports`, workspace id in the path |
| body field `format`, defaulting to `csv` | body field `format`, defaulting to `json` |

`POST /v1/exports` was removed, not aliased. It returns 410 Gone.
The handler for the v2 route is `postWorkspaceExport` in
`src/exportRoutes.js`; `buildExport` is unchanged from v1 apart from the fix
in `3ad81c9`.

=============== FILE: ops/checks.txt ===============
$ curl -s https://exports.staging.internal/internal/build-info
{"service":"exports-service","commit":"1de77b0","branch":"main","deployedAt":"2026-08-11T09:12:40Z"}

$ git merge-base --is-ancestor 3ad81c9 1de77b0; echo $?
0
