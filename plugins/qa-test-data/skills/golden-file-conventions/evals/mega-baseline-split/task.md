# One baseline covers the whole dashboard

## Problem Description

`__golden__/dashboard.json` is a single baseline for the entire dashboard
payload. Any change to any section produces one large diff, and reviewers
approve it without reading because there is no way to tell which section
moved.

Last sprint a change to the activity feed silently altered the billing
summary in the same diff and shipped.

## Output Specification

1. Replace the single baseline with per-section baselines so a change to one
   section produces a diff confined to that section, and every section
   currently covered stays covered.
2. Produce `baseline-conventions.md` stating the naming and directory
   convention you applied, so the next person adding a section follows it
   without asking.

Run `npm test` before you finish; it must pass.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "dashboard-api",
  "version": "3.1.0",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/dashboard.js ===============
'use strict';

function buildDashboard(data) {
  return {
    header: {
      workspaceName: data.workspace.name,
      plan: data.workspace.plan,
      seatsUsed: data.workspace.seatsUsed,
      seatsTotal: data.workspace.seatsTotal,
    },
    billingSummary: {
      currency: 'EUR',
      currentCents: data.billing.currentCents,
      projectedCents: data.billing.projectedCents,
      overageCents: Math.max(0, data.billing.currentCents - data.billing.includedCents),
    },
    activityFeed: data.activity.map((entry) => ({
      kind: entry.kind,
      actor: entry.actor,
      target: entry.target,
    })),
    quickActions: [
      { id: 'invite', enabled: data.workspace.seatsUsed < data.workspace.seatsTotal },
      { id: 'upgrade', enabled: data.workspace.plan !== 'enterprise' },
      { id: 'export', enabled: true },
    ],
  };
}

module.exports = { buildDashboard };

=============== FILE: src/fixtures.js ===============
'use strict';

const DATA = {
  workspace: { name: 'Acme', plan: 'team', seatsUsed: 7, seatsTotal: 10 },
  billing: { currentCents: 12000, projectedCents: 15000, includedCents: 10000 },
  activity: [
    { kind: 'document.created', actor: 'ada', target: 'Roadmap' },
    { kind: 'member.invited', actor: 'grace', target: 'lin@acme.test' },
  ],
};

module.exports = { DATA };

=============== FILE: __golden__/dashboard.json ===============
{
  "header": {
    "workspaceName": "Acme",
    "plan": "team",
    "seatsUsed": 7,
    "seatsTotal": 10
  },
  "billingSummary": {
    "currency": "EUR",
    "currentCents": 12000,
    "projectedCents": 15000,
    "overageCents": 2000
  },
  "activityFeed": [
    { "kind": "document.created", "actor": "ada", "target": "Roadmap" },
    { "kind": "member.invited", "actor": "grace", "target": "lin@acme.test" }
  ],
  "quickActions": [
    { "id": "invite", "enabled": true },
    { "id": "upgrade", "enabled": true },
    { "id": "export", "enabled": true }
  ]
}

=============== FILE: src/dashboard.golden.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { buildDashboard } = require('./dashboard');
const { DATA } = require('./fixtures');

test('dashboard matches the golden baseline', () => {
  const golden = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', '__golden__', 'dashboard.json'), 'utf8'),
  );

  assert.deepEqual(buildDashboard(DATA), golden);
});
