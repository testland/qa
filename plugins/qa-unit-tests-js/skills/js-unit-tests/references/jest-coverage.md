# Deep Jest / Vitest coverage analysis

Companion reference for `js-unit-tests` Step 5. Consult when the team needs
PR-time coverage signal that is both local-runnable and CI-gateable:
provider choice, reporter selection for downstream consumers, per-file
`coverageThreshold` rules, and parsing the per-file JSON output.

## Pick the provider

Per [jest-config][jest], on `coverageProvider`:

[jest]: https://jestjs.io/docs/configuration

> "Indicates which provider should be used to instrument code for coverage.
> Allowed values are `babel` (default) or `v8`."

| Provider | Pros | Cons |
|----------|------|------|
| `babel`  | Mature; Istanbul ecosystem; rich ignore comments. | Slower (instruments via Babel transform); may differ from production semantics. |
| `v8`     | Faster (uses V8's native coverage); closer to runtime truth. | Source-map edge cases; some files may show partial coverage where Babel is clean. |

```javascript
/** @type {import('jest').Config} */
module.exports = {
  coverageProvider: 'v8',   // or 'babel'
};
```

Each provider has a different ignore-comment syntax ([jest-config][jest]):
`babel` uses `/* istanbul ignore next */`, `v8` uses `/* c8 ignore next */`.
Don't mix; switching providers requires updating ignore comments across the
codebase.

## Choose `coverageReporters`

Per [jest-config][jest], "Any istanbul reporter can be used." Defaults are
`["clover", "json", "lcov", "text"]`. The useful ones:

| Reporter | Output | Use for |
|----------|--------|---------|
| `lcov` | `coverage/lcov.info` + HTML in `coverage/lcov-report/` | SaaS upload, cross-tool diffing. |
| `cobertura` | `coverage/cobertura-coverage.xml` | Jenkins, Azure DevOps, GitLab pipelines. |
| `clover` | `coverage/clover.xml` | Atlassian Bamboo (legacy). |
| `json` | `coverage/coverage-final.json` | Programmatic post-processing (below). |
| `json-summary` | `coverage/coverage-summary.json` | Quick whole-repo number for dashboards. |
| `text-summary` | Terminal output (compact) | CI log readability. |
| `text` | Terminal output (per-file) | Local dev. |
| `html` | `coverage/lcov-report/index.html` | Human review (per-file drill-down). |

Pragmatic default for a CI + SaaS + local-dev setup:

```javascript
coverageReporters: ['lcov', 'json', 'text-summary', 'html']
```

## Per-file thresholds (the gate-correctness pattern)

Per [jest-config][jest], `coverageThreshold` accepts global, glob, or
path-specific rules:

```javascript
coverageThreshold: {
  global: { branches: 50, functions: 50, lines: 50, statements: 50 },
  './src/components/': { branches: 40, statements: 40 },
  './src/reducers/**/*.js': { statements: 90 },
  './src/api/very-important-module.js': {
    branches: 100, functions: 100, lines: 100, statements: 100,
  },
},
```

The pattern is **lower the global, raise the critical paths**. A 50% global
keeps refactors flowing; a 100% per-file rule on a payment-processing module
catches any drop immediately.

> "Jest will fail if thresholds aren't met." ([jest-config][jest])
>
> "Negative numbers = maximum uncovered entities allowed."

The negative-number form suits legacy modules: `statements: -10` allows up
to 10 uncovered statements, letting the team ratchet down over time without
an aspirational percentage.

**Verify the gate fires:** run `npx jest --coverage` with a critical-path
file left below its threshold and confirm Jest exits non-zero. If it exits
0, check that `collectCoverageFrom` includes the file and the
`coverageThreshold` path key matches, then re-run.

## Scope `collectCoverageFrom`

Per [jest-config][jest]: "An array of glob patterns indicating which files
should have coverage collected, even if they have no tests."

```javascript
collectCoverageFrom: [
  'src/**/*.{js,jsx,ts,tsx}',
  '!src/**/*.d.ts',
  '!src/**/*.stories.{js,ts,tsx}',
  '!src/index.js',
],
```

Without this, coverage only counts files a test imported - files with no
test at all disappear from the report and coverage looks artificially high.
Always set it for an honest denominator.

## Parse the JSON output

The `json` reporter writes `coverage/coverage-final.json`, keyed by absolute
path:

```json
{
  "/abs/path/src/checkout/cart.ts": {
    "statementMap": { "0": { "start": {}, "end": {} } },
    "s": { "0": 42, "1": 42, "2": 0 },
    "f": { "0": 42, "1": 0 },
    "b": { "0": [42, 0] }
  }
}
```

`s` = per-statement hit counts; `f` = per-function; `b` = per-branch arm.

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

`coverage-summary.json` (from the `json-summary` reporter) is the
pre-aggregated version when per-statement detail isn't needed.

## Vitest equivalent

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

Key naming differences vs Jest: `collectCoverageFrom` → `coverage.include`;
`coverageReporters` → `coverage.reporter`; `coverageThreshold` →
`coverage.thresholds`. Output formats and PR-gating logic are identical.

## CI shape

```yaml
- name: Run tests with coverage
  run: npx jest --coverage --coverageReporters=lcov,json,text-summary

- name: Show summary in CI log
  run: cat coverage/coverage-summary.json

- name: Upload to dashboard
  if: always()
  uses: codecov/codecov-action@v4
  with:
    files: coverage/lcov.info
    token: ${{ secrets.CODECOV_TOKEN }}
```

`--coverage` activates `collectCoverage: true`; `--coverageReporters`
overrides config-side reporter selection.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `collectCoverage: false` in CI | No coverage data emitted; downstream gate is empty. | `--coverage` flag in the test command. |
| Skipping `collectCoverageFrom` | Untested files absent from denominator; coverage inflated. | Always set explicitly. |
| `coverageThreshold.global` only | A new module joins at 0%; global drops 0.3pp; gate passes. | Per-path rules for critical modules. |
| Mixing `babel` and `v8` ignore comments | One provider misses the ignore; coverage drops mysteriously. | Pick one; grep-replace if switching. |
| `coverage-final.json` as the gate input | Per-statement detail is huge; gate scripts slow. | `coverage-summary.json` for whole-repo + `lcov.info` for per-line drilldown. |
| `coverageDirectory` outside the repo | CI artifact upload misses it. | Keep in `coverage/` (default). |
| 100% global threshold | First refactor fails the build; team disables coverage entirely. | Globals at the maintainable floor, not the aspirational ceiling. |

## Limitations

- **Source-map fidelity affects the V8 provider.** Files through multiple
  transforms (Babel + TS + bundler) may show wrong paths or partial
  coverage; switch to `babel` if so.
- **Coverage doesn't equal correctness.** A 100%-covered `if (x) {}` (empty
  body) measures as covered but tests nothing.
- **Async branches are tricky.** The resolved path may show covered while
  the rejection arm is missed unless tests explicitly throw.
- **Multi-project (`projects: [...]`) coverage is per-project.** Aggregate
  via each project's `--coverageDirectory` + a combiner script.

## References

- [jest-config][jest] - `collectCoverage`, `coverageProvider`,
  `coverageReporters`, `coverageThreshold`, `collectCoverageFrom`.
- `lcov-analysis` (qa-test-reporting) - the LCOV file Jest emits feeds this
  parser for cross-tool diffing; also the home for Cobertura-consuming
  pipelines.
- `coverage-diff-reporter` (qa-test-reporting) - PR-comment formatter built
  on the parsed Jest output.
- `test-coverage-targeter` (qa-test-reporting) - picks which uncovered
  branches to target, given the Jest output.
