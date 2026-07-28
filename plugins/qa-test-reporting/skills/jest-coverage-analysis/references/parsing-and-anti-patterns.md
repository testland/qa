# Parsing coverage-final.json and coverage-gate anti-patterns

Companion detail for `jest-coverage-analysis`. The Jest / Vitest config in SKILL.md is the runnable core; this file holds the full JSON parser and the anti-pattern catalog.

## The coverage-final.json shape

The `json` reporter writes `coverage/coverage-final.json` with a per-file structure keyed by absolute path:

```json
{
  "/abs/path/src/checkout/cart.ts": {
    "path": "/abs/path/src/checkout/cart.ts",
    "statementMap": { "0": { "start": {}, "end": {} } },
    "fnMap": { },
    "branchMap": { },
    "s": { "0": 42, "1": 42, "2": 0 },
    "f": { "0": 42, "1": 0 },
    "b": { "0": [42, 0] }
  }
}
```

`s` = per-statement hit counts; `f` = per-function; `b` = per-branch arm.

## Full per-file parser

```javascript
// scripts/parse_jest_coverage.js
import { readFileSync } from 'node:fs';

const data = JSON.parse(readFileSync('coverage/coverage-final.json', 'utf8'));

for (const [absPath, file] of Object.entries(data)) {
  const stmts = Object.values(file.s);
  const stmtPct = (stmts.filter(c => c > 0).length / stmts.length) * 100;

  const fns = Object.values(file.f);
  const fnPct = (fns.filter(c => c > 0).length / fns.length) * 100;

  // Branch coverage: each entry is an array of arm hit counts.
  const branchEntries = Object.values(file.b);
  const branchTotal = branchEntries.flat().length;
  const branchHit = branchEntries.flat().filter(c => c > 0).length;
  const brPct = branchTotal === 0 ? 100 : (branchHit / branchTotal) * 100;

  console.log({ path: absPath, stmtPct, fnPct, brPct });
}
```

The `coverage-summary.json` file (from the `json-summary` reporter) is the pre-aggregated version when per-statement detail isn't needed.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `collectCoverage: false` in CI | No coverage data emitted; downstream gate is empty. | `--coverage` flag in the test command (Step 7). |
| Skipping `collectCoverageFrom` | Files with no test silently absent from denominator; coverage inflated. | Always set explicitly (Step 4). |
| `coverageThreshold.global` only, no per-path rules | A new module under `src/api/` joins at 0% coverage; global drops by 0.3pp; gate passes. | Per-path rules for critical modules (Step 3). |
| Mixing `babel` and `v8` ignore comments | One provider misses the ignore; coverage drops mysteriously. | Pick one; grep-replace if switching. |
| Using `coverage-final.json` as the gate input | Per-statement detail is huge; gate scripts slow. | `coverage-summary.json` for whole-repo + `lcov.info` for per-line drilldown. |
| `coverageDirectory: '/tmp/...'` outside the repo | CI artifact upload step misses it. | Keep in `coverage/` (default). |
| Threshold set at 100% on a global rule | First refactor fails the build; team disables coverage entirely. | Set globals at the **maintainable floor**, not aspirational ceiling. |
