---
name: mocha-tests
description: Configures and runs Mocha — pluggable JS test runner pairable with Chai assertions, Sinon mocking, and nyc / c8 coverage; supports BDD interface (`describe` / `it`) and TDD interface (`suite` / `test`); async tests via callbacks / promises / async-await; `--parallel` mode (Mocha 8+); `.mocharc.json` config; per-test exclusivity via `.only()` / `.skip()`. Use when the user prefers a minimal pluggable runner (vs Jest's batteries-included) or maintains legacy Mocha codebases.
rating: 23
d6: 4
archetype: S1
---

# mocha-tests

## Overview

Per [mochajs.org][mocha]:

[mocha]: https://mochajs.org/

Mocha is the original mainstream JS test runner. Distinguishing
features:

- **Pluggable**: assertions (Chai / Node assert), mocking (Sinon /
  Jest's vi.fn equivalent), coverage (nyc / c8) are separate
  libraries — pick what you need.
- **Two interfaces**: BDD (`describe`/`it`, default) and TDD
  (`suite`/`test`).
- **Reporter ecosystem**: spec, json, html, tap, dot, nyan, mocha-junit-reporter, etc.
- **Parallel mode** (Mocha 8+): `--parallel` flag for multi-process runs.

Modern web projects increasingly default to Jest or Vitest; Mocha
remains strong for Node.js tooling, libraries, and pre-existing
codebases.

## When to use

- Legacy codebase already on Mocha — migrating away has cost.
- Library / tooling project where minimal-deps + pluggable
  architecture matters.
- Team prefers Chai's assertion-fluency syntax over Jest's
  `expect`.
- Need TDD-style interface (`suite`/`test`) over BDD.

For new browser-side projects, prefer [`vitest-tests`](../vitest-tests/SKILL.md)
or [`jest-tests`](../jest-tests/SKILL.md).

## Step 1 — Install

```bash
npm install --save-dev mocha
# Plus typical peers:
npm install --save-dev chai sinon nyc
```

## Step 2 — First test

```javascript
// test/sum.test.js
const assert = require('node:assert');
const { sum } = require('../src/sum');

describe('sum', () => {
  it('adds 1 + 2 to equal 3', () => {
    assert.strictEqual(sum(1, 2), 3);
  });
});
```

With Chai for fluent assertions:

```javascript
const { expect } = require('chai');

describe('sum', () => {
  it('adds 1 + 2 to equal 3', () => {
    expect(sum(1, 2)).to.equal(3);
  });
});
```

Wire `package.json`:

```json
{
  "scripts": {
    "test": "mocha"
  }
}
```

Default test glob: `./test/*.{js,cjs,mjs}` plus `./test/**/*.spec.js`.

## Step 3 — `.mocharc.json` configuration

Mocha supports config files (`.mocharc.json`, `.mocharc.js`,
`.mocharc.yaml`, or `mocha` key in package.json):

```json
{
  "spec": ["test/**/*.spec.js"],
  "recursive": true,
  "require": ["ts-node/register", "./test/setup.js"],
  "reporter": "spec",
  "timeout": 5000,
  "slow": 1000,
  "parallel": true,
  "jobs": 4,
  "ui": "bdd",
  "diff": true,
  "extension": ["js", "ts"]
}
```

Key options:

- `parallel: true` + `jobs: N` — multi-process parallel mode (Mocha 8+)
- `ui: 'bdd'` (default) vs `ui: 'tdd'` — interface choice
- `recursive: true` — scan nested test directories
- `require: [...]` — preload modules (TS support, custom setup)

## Step 4 — Async patterns

Per [mocha][mocha], three async approaches:

```javascript
// 1. Callback-based (legacy)
it('callback async', function(done) {
  setTimeout(() => {
    expect(true).to.be.true;
    done();
  }, 100);
});

// 2. Promise-based
it('promise async', () => {
  return doAsyncWork().then(result => {
    expect(result).to.equal(42);
  });
});

// 3. Async / await (modern; preferred)
it('async/await', async () => {
  const result = await doAsyncWork();
  expect(result).to.equal(42);
});
```

The async function MUST `return` (or `await`) — without that, the
promise's rejection isn't surfaced to Mocha and tests pass-by-accident.

## Step 5 — Hooks

```javascript
describe('User service', () => {
  before(async () => {
    // runs once before all tests in this describe block
    await db.connect();
  });
  after(async () => {
    await db.disconnect();
  });
  beforeEach(() => {
    // runs before each test
  });
  afterEach(() => {
    // runs after each test
  });

  it('creates a user', async () => {
    // ...
  });
});
```

Hooks support async/promise patterns same as tests.

## Step 6 — Exclusive + skipped tests

```javascript
it.only('runs only this test', () => { /* ... */ });
describe.only('runs only tests in this block', () => { /* ... */ });
it.skip('skipped test', () => { /* ... */ });
xit('also skipped (alternate syntax)', () => { /* ... */ });
```

CI gating: forbid `.only` in committed code via lint rule (most
codebases use `eslint-plugin-mocha`'s `mocha/no-exclusive-tests`).

## Step 7 — Coverage with nyc

```bash
npm install --save-dev nyc
```

`.nycrc.json`:

```json
{
  "extends": "@istanbuljs/nyc-config-typescript",
  "all": true,
  "check-coverage": true,
  "branches": 80,
  "lines": 80,
  "functions": 80,
  "statements": 80,
  "include": ["src/**/*.{js,ts}"],
  "exclude": ["**/*.test.{js,ts}", "**/types.ts"],
  "reporter": ["text", "lcov", "html"]
}
```

Run:

```bash
nyc mocha
```

Modern alternative: `c8` (uses Node's built-in V8 coverage; faster,
no instrumentation):

```bash
npm install --save-dev c8
c8 mocha
```

## Step 8 — Parallel mode

Per [mocha][mocha] (Mocha 8+):

```bash
mocha --parallel --jobs 4
```

Tests must be independent — shared state across describe blocks
breaks parallel runs. Limitations:
- `before` / `after` hooks at the top-level scope don't run
  per-process consistently
- File-level state mutations leak between describes in the same
  process

## Step 9 — CI integration

```yaml
- run: npm ci
- run: npx mocha --reporter mocha-junit-reporter --reporter-option mochaFile=./test-results/junit.xml
# Or with coverage:
- run: npx c8 --reporter lcov mocha
- uses: codecov/codecov-action@v4
  with: { files: ./coverage/lcov.info }
```

The `mocha-junit-reporter` package emits JUnit XML for
[`junit-xml-analysis`](../../qa-test-reporting/skills/junit-xml-analysis/SKILL.md).

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Forget `return` / `await` on async test body | Promise rejection silently passes the test | Always `return` or `await` (Step 4) |
| Commit `.only` accidentally | CI runs only one test | Lint rule `mocha/no-exclusive-tests` (Step 6) |
| Use `--parallel` with shared `before` hooks | Hooks run inconsistently per-process | Per-test setup (Step 8) |
| Mix BDD + TDD interfaces | Reader confusion | Pick one in `.mocharc.json` `ui:` (Step 3) |
| Skip `--check-coverage` in nyc | Coverage gates not enforced | Set `--check-coverage` + thresholds (Step 7) |

## Limitations

- Mocha doesn't bundle assertions / mocking / coverage — more
  setup vs Jest/Vitest.
- Watch mode less polished than Vitest's.
- Snapshot testing not built-in (use `mocha-chai-jest-snapshot`
  third-party).
- ESM support workable but historically rough; pin a recent Mocha
  version.

## References

- [mocha][mocha] — official site
- mochajs.org/api — API reference
- chaijs.com — Chai assertions (typical pairing)
- sinonjs.org — Sinon mocking (typical pairing)
- istanbul.js.org / github.com/bcoe/c8 — coverage tools
- github.com/michaelleeallen/mocha-junit-reporter — JUnit XML reporter
- [`jest-tests`](../jest-tests/SKILL.md),
  [`vitest-tests`](../vitest-tests/SKILL.md),
  [`ava-tests`](../ava-tests/SKILL.md),
  [`jasmine-tests`](../jasmine-tests/SKILL.md) — sister tools
- [`test-code-conventions`](../../qa-test-review/skills/test-code-conventions/SKILL.md)
  — cross-plugin: test code hygiene
