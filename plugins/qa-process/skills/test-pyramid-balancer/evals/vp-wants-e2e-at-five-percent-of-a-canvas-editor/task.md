# VP read something about test layers and wants our end-to-end suite at 5% by the end of the quarter

## Problem Description

`studio-web` is our floor-plan editor. It is the product — customers open it,
drag walls around on a canvas, snap furniture to a grid, undo, export. There is
a thin Node API behind it but almost nobody ships changes to that.

Our VP of Engineering read something over the weekend about the ratios a test
suite should sit at and came into Monday's staff meeting with a number: end-to-
end tests should be 5% of the suite, we are at 20%, and she wants a plan on her
desk by Friday that gets us there by the end of the quarter. She was specific
that the plan should name the tests coming out.

Where we actually are is in `data/current-mix.json`: 305 unit, 64 integration,
96 end-to-end, 465 total. `data/layer-stats.json` has the per-layer runtime and
the retry-and-pass rate from the last four weeks of main. Our PR job is 14
minutes wall clock with the end-to-end suite sharded four ways.

`data/change-shape-90d.json` is what our estimation tooling classified over the
last 90 days of commits. It is current as of yesterday; do not regenerate it.

`docs/coverage-map.md` is the map one of our seniors keeps of what is covered
where. Read it before you decide anything — she is careful and it is accurate.

I have to present this and I would rather present something defensible than
something that hits the number. If the number is wrong for us I need to be able
to say why in one slide, with arithmetic, and I still need to come back with a
real reduction rather than a lecture.

## Output Specification

1. `scripts/targets.js` — reads `data/current-mix.json` and
   `data/change-shape-90d.json` and writes `reports/targets.json` carrying, per
   layer, the target share, the target case count, and the delta from today.
   Must run with `node scripts/targets.js` and no dependencies.
2. `test/targets.test.js` — tests for the target derivation, running under
   `npm test` alongside the test already in the repo. `npm test` must pass when
   you are done.
3. `reports/quarter-plan.md` — what goes to the VP: the targets, the arithmetic
   that produced them, the reduction you are actually proposing with the tests
   named, and a direct answer on the 5% figure.

Do not edit anything under `data/` or `docs/`, and do not change `lib/share.js`
or `test/share.test.js`.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "studio-web",
  "version": "9.4.2",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: lib/share.js ===============
export function share(part, total) {
  if (total <= 0) throw new RangeError('total must be positive');
  return Math.round((part / total) * 1000) / 10;
}

export function countFor(sharePct, total) {
  if (sharePct < 0 || sharePct > 100) throw new RangeError('share must be 0-100');
  return Math.round((sharePct / 100) * total);
}

=============== FILE: test/share.test.js ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { share, countFor } from '../lib/share.js';

test('share is a percentage to one decimal place', () => {
  assert.equal(share(305, 465), 65.6);
});

test('share of zero parts is zero', () => {
  assert.equal(share(0, 465), 0);
});

test('a non-positive total is rejected', () => {
  assert.throws(() => share(1, 0), RangeError);
});

test('countFor inverts share', () => {
  assert.equal(countFor(15, 508), 76);
});

test('countFor rejects a share outside 0-100', () => {
  assert.throws(() => countFor(101, 508), RangeError);
});

=============== FILE: data/current-mix.json ===============
{
  "repo": "studio-web",
  "measured": "2026-09-12",
  "source": "junit xml from the last green run on main",
  "layers": {
    "unit": { "cases": 305, "files": 88 },
    "integration": { "cases": 64, "files": 21 },
    "e2e": { "cases": 96, "files": 27 }
  },
  "total_cases": 465
}

=============== FILE: data/layer-stats.json ===============
{
  "window": "4 weeks of main, 2026-08-15 to 2026-09-12",
  "layers": {
    "unit": { "cases": 305, "serial_seconds": 171, "retry_and_pass_rate": 0.001 },
    "integration": { "cases": 64, "serial_seconds": 280, "retry_and_pass_rate": 0.006 },
    "e2e": { "cases": 96, "serial_seconds": 1410, "shards": 4, "retry_and_pass_rate": 0.041 }
  },
  "pr_job_wall_clock_seconds": 840,
  "note": "e2e serial seconds are the sum across shards; wall clock for that stage is 352s."
}

=============== FILE: data/change-shape-90d.json ===============
{
  "repo": "studio-web",
  "window": "2026-06-14 to 2026-09-12",
  "commits_classified": 188,
  "generated": "2026-09-12",
  "regenerate_cost": "~35 minutes; do not run by hand",
  "distribution": {
    "ui-heavy": { "commits": 128, "pct_commits": 68, "pct_files": 71 },
    "pure-logic": { "commits": 32, "pct_commits": 17, "pct_files": 15 },
    "service-layer": { "commits": 21, "pct_commits": 11, "pct_files": 10 },
    "data-heavy": { "commits": 7, "pct_commits": 4, "pct_files": 4 }
  },
  "mixed_commits": 9,
  "not_decided_here": "target layer ratios, effort hours and test selection are downstream decisions"
}

=============== FILE: docs/coverage-map.md ===============
# What is covered where - studio-web

Maintained by @priya-s. Last walked through 2026-09-08, file by file.

## End-to-end tests that duplicate a lower layer

These twelve assert something that already has an equivalent assertion at the
unit layer. They are safe to retire; the behaviour keeps its cover.

| e2e test                                | Duplicates                          |
|-----------------------------------------|-------------------------------------|
| `snap distance rounds to the grid`      | `test/unit/geometry.test.js`        |
| `rotation preserves bounding box area`  | `test/unit/geometry.test.js`        |
| `hex colour parses with and without #`  | `test/unit/colour.test.js`          |
| `wall length label uses metric`         | `test/unit/units.test.js`           |
| `wall length label uses imperial`       | `test/unit/units.test.js`           |
| `area sums to the sum of its rooms`     | `test/unit/area.test.js`            |
| `furniture id is a stable uuid v4`      | `test/unit/ids.test.js`             |
| `export filename is slugified`          | `test/unit/export-name.test.js`     |
| `zoom clamps at 25% and 400%`           | `test/unit/viewport.test.js`        |
| `pan offset is clamped to the canvas`   | `test/unit/viewport.test.js`        |
| `layer order is stable under insert`    | `test/unit/layers.test.js`          |
| `undo stack caps at fifty entries`      | `test/unit/history.test.js`         |

## End-to-end tests with no equivalent anywhere else

These nine are real pointer-event behaviour against a real canvas element.
There is no lower layer for them: the drag, the hit-testing and the repaint are
the thing being asserted, and we have twice tried and failed to fake them in
jsdom.

- `drag a wall and the adjoining rooms re-flow`
- `multi-select with shift and move as a group`
- `snap-to-grid engages within 8 device pixels`
- `resize handle keeps aspect ratio with shift held`
- `undo after a transform restores the exact geometry`
- `two-finger pan on a trackpad does not select`
- `copy-paste places at the pointer, not the origin`
- `export to PDF matches the on-screen bounds`
- `autosave fires after a drag and survives reload`

Customers have reported eight canvas regressions in the last year. Six were
caught by tests in this second list before release. The other two were not
caught at all.

## Where the middle layer is thin

The API boundary between the editor and the document service has 64 integration
tests covering save, load and conflict resolution. Nothing covers the export
pipeline, the share-link permission model, the template import path, or the
font-substitution fallback. All four of those have shipped bugs this year that
unit tests could not have caught and that we found in staging.
