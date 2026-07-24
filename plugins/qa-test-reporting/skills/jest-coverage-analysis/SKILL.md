---
name: jest-coverage-analysis
description: "Configures Jest's built-in coverage (Istanbul-instrumented `babel` provider or V8-native `v8` provider), wires the right `coverageReporters` for downstream consumption (`lcov` for SaaS / cross-tool, `cobertura` for Jenkins, `text-summary` for terminal, `html` for human review), authors per-file `coverageThreshold` rules that focus the gate on critical paths (vs the global-only foot-gun), and parses the per-file JSON output for PR-time deltas. Use when the project tests with Jest (or Vitest, which uses the same Istanbul/V8 provider) and the team needs PR-time coverage signal that's both local-runnable and CI-gateable."
---

# jest-coverage-analysis

## Overview

Jest ships with built-in coverage. Per [jest-config][jest], on
`coverageProvider`:

[jest]: https://jestjs.io/docs/configuration

> "Indicates which provider should be used to instrument code for
> coverage. Allowed values are `babel` (default) or `v8`."

The `babel` provider runs the project through Istanbul-style
instrumentation; `v8` uses the Node V8 engine's native coverage
hooks (faster, but with subtler edge cases around source maps).

Coverage output goes to `coverageDirectory` (default `coverage/`)
in the formats listed in `coverageReporters`. The defaults are
`["clover", "json", "lcov", "text"]` ([jest-config][jest]) - `lcov`
is the most useful for cross-tool consumption (see
`lcov-analysis`).

## When to use

- The project tests with **Jest** or **Vitest** (Vitest uses the same
  Istanbul / V8 coverage stack and the same config keys).
- A PR coverage gate needs per-file thresholds, not just a global
  number.
- A SaaS coverage dashboard (Codecov, Coveralls) consumes LCOV; the
  default `coverageReporters` already produces it.
- A Jenkins pipeline expects Cobertura XML.

If the project is multi-language (Jest + Java + Python), see
`coverage-diff-reporter` for
the cross-tool aggregation pattern; this skill is the Jest-specific
piece.

## Step 1 - Pick the provider

Per [jest-config][jest]:

| Provider | Pros                                                         | Cons                                                                  |
|----------|--------------------------------------------------------------|-----------------------------------------------------------------------|
| `babel`  | Mature; Istanbul ecosystem; rich ignore comments.            | Slower (instruments via Babel transform); may differ from production semantics. |
| `v8`     | Faster (uses V8's native coverage); closer to runtime truth. | Source-map edge cases; some files may show partial coverage where Babel is clean. |

```javascript
/** @type {import('jest').Config} */
module.exports = {
  coverageProvider: 'v8',   // or 'babel'
};
```

Each provider has a different ignore-comment syntax
([jest-config][jest]):

- `babel`: `/* istanbul ignore next */`
- `v8`: `/* c8 ignore next */`

Don't mix; switching providers requires updating ignore comments
across the codebase.

## Step 2 - Choose `coverageReporters`

Per [jest-config][jest], "Any [istanbul reporter](https://github.com/istanbuljs/istanbuljs/tree/master/packages/istanbul-reports/lib) can be used."
The useful ones:

| Reporter           | Output                                | Use for                                    |
|--------------------|---------------------------------------|--------------------------------------------|
| `lcov`             | `coverage/lcov.info` + HTML in `coverage/lcov-report/` | SaaS upload, cross-tool diffing.   |
| `cobertura`        | `coverage/cobertura-coverage.xml`      | Jenkins, Azure DevOps, GitLab pipelines.   |
| `clover`           | `coverage/clover.xml`                  | Atlassian Bamboo (legacy).                  |
| `json`             | `coverage/coverage-final.json`         | Programmatic post-processing (Step 5).     |
| `json-summary`     | `coverage/coverage-summary.json`       | Quick whole-repo number for dashboards.    |
| `text-summary`     | Terminal output (compact)              | CI log readability.                         |
| `text`             | Terminal output (per-file)              | Local dev.                                  |
| `html`             | `coverage/lcov-report/index.html`       | Human review (drill-down per file).        |

Pragmatic default for a CI + SaaS + local-dev setup:

```javascript
coverageReporters: ['lcov', 'json', 'text-summary', 'html']
```

`lcov` for the dashboard, `json` for programmatic post-processing,
`text-summary` for the CI log, `html` for the human.

## Step 3 - Per-file thresholds (the gate-correctness pattern)

Per [jest-config][jest], `coverageThreshold` accepts global, glob,
or path-specific rules:

```javascript
coverageThreshold: {
  global: {
    branches: 50,
    functions: 50,
    lines: 50,
    statements: 50,
  },
  './src/components/': {
    branches: 40,
    statements: 40,
  },
  './src/reducers/**/*.js': {
    statements: 90,
  },
  './src/api/very-important-module.js': {
    branches: 100,
    functions: 100,
    lines: 100,
    statements: 100,
  },
},
```

The pattern is **lower the global, raise the critical paths**.
A 50% global keeps refactors flowing; a 100% per-file rule on a
payment-processing module ensures any drop is caught immediately.

> "Jest will fail if thresholds aren't met." ([jest-config][jest])
>
> "Negative numbers = maximum uncovered entities allowed."

The negative-number form is useful for legacy modules: `statements: -10`
allows up to 10 uncovered statements before failing. Lets the team
ratchet down over time without setting an aspirational percentage.

## Step 4 - Scope `collectCoverageFrom`

Per [jest-config][jest]:

> "An array of glob patterns indicating which files should have
> coverage collected, even if they have no tests."

```javascript
collectCoverageFrom: [
  'src/**/*.{js,jsx,ts,tsx}',
  '!src/**/*.d.ts',
  '!src/**/*.stories.{js,ts,tsx}',
  '!src/index.js',
],
```

Without this, coverage only counts files that a test imported. Files
with **no test at all** disappear from the report - coverage looks
artificially high. Always set `collectCoverageFrom` for an honest
denominator.

## Step 5 - Parse the JSON output

The `json` reporter writes `coverage/coverage-final.json` with a
per-file structure:

```json
{
  "/abs/path/src/checkout/cart.ts": {
    "path": "/abs/path/src/checkout/cart.ts",
    "statementMap": { "0": { "start": {...}, "end": {...} }, ... },
    "fnMap": { ... },
    "branchMap": { ... },
    "s": { "0": 42, "1": 42, "2": 0 },
    "f": { "0": 42, "1": 0 },
    "b": { "0": [42, 0], ... }
  }
}
```

`s` = per-statement hit counts; `f` = per-function; `b` = per-branch
arm.

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

The `coverage-summary.json` file (from the `json-summary` reporter)
is the pre-aggregated version when per-statement detail isn't
needed.

## Step 6 - Vitest equivalent

Vitest uses the same Istanbul / V8 stack with `vitest --coverage`:

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      thresholds: {
        global: { branches: 50, functions: 50, lines: 50, statements: 50 },
        'src/api/**/*.ts': { branches: 100, functions: 100, lines: 100, statements: 100 },
      },
    },
  },
});
```

Key naming differences vs Jest:

- `collectCoverageFrom` → `coverage.include`
- `coverageReporters` → `coverage.reporter`
- `coverageThreshold` → `coverage.thresholds`

The output formats and PR-gating logic are identical - the
downstream parser works against either.

## Step 7 - CI shape

```yaml
- name: Run tests with coverage
  run: npx jest --coverage --coverageReporters=lcov,json,text-summary

- name: Show summary in CI log
  run: cat coverage/coverage-summary.json

- name: Upload to dashboard
  if: always()
  run: curl -s https://codecov.io/bash -o codecov.sh && bash codecov.sh -f coverage/lcov.info

- name: Per-file delta vs main
  if: github.event_name == 'pull_request'
  run: node scripts/jest-pr-comment.mjs
```

`--coverage` activates `collectCoverage: true`, `--coverageReporters`
overrides config-side reporter selection.

## Anti-patterns

| Anti-pattern                                                         | Why it fails                                                              | Fix |
|----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| `collectCoverage: false` in CI                                        | No coverage data emitted; downstream gate is empty.                      | `--coverage` flag in the test command (Step 7). |
| Skipping `collectCoverageFrom`                                       | Files with no test silently absent from denominator; coverage inflated.   | Always set explicitly (Step 4). |
| `coverageThreshold.global` only, no per-path rules                    | A new module under `src/api/` joins at 0% coverage; global drops by 0.3pp; gate passes. | Per-path rules for critical modules (Step 3). |
| Mixing `babel` and `v8` ignore comments                               | One provider misses the ignore; coverage drops mysteriously.              | Pick one; grep-replace if switching. |
| Using `coverage-final.json` as the gate input                         | Per-statement detail is huge; gate scripts slow.                          | `coverage-summary.json` for whole-repo + `lcov.info` for per-line drilldown. |
| `coverageDirectory: '/tmp/...'` outside the repo                      | CI artifact upload step misses it.                                        | Keep in `coverage/` (default). |
| Threshold set at 100% on a global rule                                | First refactor fails the build; team disables coverage entirely.         | Set globals at the **maintainable floor**, not aspirational ceiling. |

## Limitations

- **Source-map fidelity affects V8 provider.** Files that go through
  multiple transforms (Babel + TS + bundler) may show wrong file
  paths or partial coverage under the V8 provider; switch to `babel`
  if so.
- **Coverage doesn't equal correctness.** A 100%-covered function
  with `if (x) {}` (empty body) measures as covered but tests
  nothing.
- **Async branches are tricky.** A function that resolves a Promise
  may show the resolved path as covered but miss the rejection arm
  unless tests explicitly throw.
- **Multi-project (`projects: [...]`) coverage is per-project.**
  Aggregate via the `--coverageDirectory` of each project + a
  combiner script if a single repo number is needed.

## References

- [jest-config][jest] - `collectCoverage`, `coverageProvider`
  (`babel` vs `v8`), `coverageReporters` (defaults
  `["clover","json","lcov","text"]`), `coverageThreshold` (global +
  glob + path), `collectCoverageFrom`, `coveragePathIgnorePatterns`.
- `lcov-analysis` - the LCOV file Jest
  emits feeds this parser for cross-tool diffing.
- `cobertura-analysis` - Jest
  also emits Cobertura XML when configured; this parser consumes it.
- `coverage-diff-reporter` - 
  PR-comment formatter built on top of the parsed Jest output.
- `test-coverage-targeter` - picks which uncovered branches to target, given the Jest
  output.
