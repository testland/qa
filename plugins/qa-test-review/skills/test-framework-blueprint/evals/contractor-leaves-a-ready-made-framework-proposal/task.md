# Departing contractor left us a framework proposal the CTO wants signed off

## Problem Description

I am the SDET at Meridian Freight. I started five weeks ago on Dispatch, our
parcel routing product - Node and TypeScript API, Postgres, and a React ops
console that the dispatch desk lives in all day.

Dan Whitlock finished a six-week contract here on 5 September and left behind
`proposals/automation-framework.md`. Our CTO read it over the weekend and
wants it signed off at Thursday's engineering review. I have until then to
either endorse it or come back with something better, and better has to be
argued rather than asserted - Dan is well regarded, he shipped what he was
hired for, and that proposal is more thought than anyone here has put into
testing in two years.

Three things make it hard to just say no. The internal Selenium Grid is
already paid for and sitting close to idle. The central QA group maintains
the shared Java library the proposal builds on and has offered to own the
suite for us. And our other product, Meridian Fleet, is a Java shop, so there
is real Java expertise in the building and a hiring pipeline for it.

Last week I pulled the change-shape numbers off git and collected the intake
answers from the team. Both are attached, along with Dan's proposal and what
is in the repo today (`npm test` passes - three tests, all green).

Give me the design I should take to Thursday. If it is Dan's, say so.

## Output Specification

1. Write `docs/test-conventions.md` - the design the team will live by. At
   minimum it must state: which layers this framework covers and which it
   explicitly does not, with a reason per row; the runner and the language,
   with the alternatives that were considered and the specific reason each
   one lost; the directory layout; and the fixtures the suite needs, each
   with its scope, what it provides, and whether tests mutate it.
2. Write `docs/implementation-order.md` - what gets built first and what each
   later piece waits on.
3. Write `docs/review-answer.md` - the answer I take into Thursday's review
   about Dan's proposal, naming what in it survives and what does not.
4. Do not write harness code. Do not modify anything under `src/` or `test/`.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "meridian-dispatch",
  "version": "3.4.1",
  "private": true,
  "scripts": {
    "test": "node --test \"test/**/*.test.js\"",
    "start": "node src/server.js"
  },
  "engines": {
    "node": ">=20"
  }
}

=============== FILE: src/rating.js ===============
'use strict';

const ZONE_MULTIPLIER = { A: 1.0, B: 1.25, C: 1.6 };

function bandFor(weightKg) {
  if (weightKg <= 1) return 800;
  if (weightKg <= 5) return 1480;
  if (weightKg <= 20) return 2600;
  return 2600 + Math.ceil(weightKg - 20) * 90;
}

function quoteFor({ weightKg, zone }) {
  const multiplier = ZONE_MULTIPLIER[zone];
  if (!multiplier) throw new Error(`unknown zone: ${zone}`);
  return Math.round(bandFor(weightKg) * multiplier);
}

module.exports = { quoteFor, bandFor };

=============== FILE: test/rating.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { quoteFor } = require('../src/rating');

test('quotes a mid-band parcel against the zone multiplier', () => {
  assert.equal(quoteFor({ weightKg: 4, zone: 'B' }), 1850);
});

test('quotes above the top band per excess kilo', () => {
  assert.equal(quoteFor({ weightKg: 25, zone: 'C' }), 4880);
});

test('rejects an unknown zone', () => {
  assert.throws(() => quoteFor({ weightKg: 4, zone: 'Z' }), /unknown zone/);
});

=============== FILE: proposals/automation-framework.md ===============
# Automation framework proposal - Meridian Dispatch

Author: D. Whitlock (contract, ended 2026-09-05)
Status: awaiting sign-off

## Stack

- Java 17, Maven
- Selenium WebDriver 4 + Cucumber-JVM 7, scenarios authored in Gherkin
- Page Object Model, three-level base class:
  `BaseTest` -> `WebTest` -> `DispatchTest`
- Executes on the existing internal grid (grid.meridian.internal, 24 nodes)
- Depends on `com.meridian.qa:qa-common:4.2.0`, the shared helper library the
  central QA group maintains for Meridian Fleet

## Coverage

| Layer   | Covered here                                  |
|---------|-----------------------------------------------|
| Unit    | No - owned by the dev teams, stays with them  |
| API     | No - out of scope for this phase              |
| Web E2E | Yes - all 31 console screens, one feature file per screen |

## Why this shape

This is the design I built at my previous client (a retail storefront), where
it grew to 640 UI scenarios over two years and held up. The grid is already
paid for. Gherkin means the operations managers can read the scenarios. And
the central QA group can maintain it, because they already own `qa-common`
and know this exact stack.

## Estimated build

Nine weeks, one engineer. Phase 1 is the harness and the three-level base
class; phase 2 is the 31 screen objects; phase 3 is the feature files.

=============== FILE: reports/change-shape.md ===============
# Merged PRs by touched area - 2026-06-15 to 2026-09-12

Generated from `git log --name-only --merges` over 412 merged PRs.

| Area                                    | PRs  | Share |
|-----------------------------------------|------|-------|
| `src/api/**` or `src/domain/**` only    | 271  | 65.8% |
| `src/api/**` and `console/**` together  |  76  | 18.4% |
| `console/**` only                       |  41  | 10.0% |
| infra / CI / docs only                  |  24  |  5.8% |

- 84.2% of merged PRs touched the API or the domain layer.
- Median PR open-to-merge time: 6h 10m. The team merges to main 8-14 times a
  working day.
- The console ships on a weekly release train. The API ships continuously.
- The last four production incidents (INC-2201, INC-2214, INC-2230, INC-2248)
  were all rating or routing defects in the domain layer. None involved the
  console.

=============== FILE: reports/team-skills.md ===============
# Who writes and maintains the tests

Intake answers collected 2026-09-08 by @s.okafor (SDET).

| Engineer    | Primary    | Also writes          | Writes Java? |
|-------------|------------|----------------------|--------------|
| @d.arnette  | TypeScript | SQL                  | no           |
| @l.pereira  | TypeScript | SQL, some Python     | no           |
| @j.mbeki    | TypeScript | Go (side projects)   | no           |
| @h.sorensen | TypeScript | SQL                  | no           |
| @a.vasquez  | TypeScript | Python               | no           |
| @k.tran     | TypeScript | -                    | no           |

Ownership decision, recorded in the intake on 2026-09-08 and signed off by
the CTO in March: **product engineers write and maintain their own tests.**

This is a change. Until March the central QA group wrote them. That group is
two people covering nine products; their current queue for a test change is
three weeks, and that queue is the reason the policy changed. Their offer to
own a new suite has not been costed against the other eight products and no
headcount has been added.
