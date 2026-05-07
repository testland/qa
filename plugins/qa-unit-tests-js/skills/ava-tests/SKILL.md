---
name: ava-tests
description: "Configures and runs AVA — concurrent-by-default JS/TS test framework with isolated test files (each file runs in its own Node process), no globals (explicit `import test from 'ava'`), async-first API, snapshot support, and TypeScript via `@ava/typescript`. Use when the user wants minimal-API parallel-by-default tests, or works with libraries (vs apps) where per-file isolation prevents test interference."
rating: 22
d6: 4
archetype: S1
---

# ava-tests

## Overview

Per [github.com/avajs/ava][ava-gh]:

[ava-gh]: https://github.com/avajs/ava

AVA's distinguishing properties:

- **Concurrent by default**: each test file runs in a separate Node
  process; tests within a file run concurrently unless serial.
- **No globals**: `import test from 'ava'` — explicit, easier to
  type, no dependency-injection hacks.
- **Async-first**: native promise/async-await support; no `done`
  callback dance.
- **Powerful assertion failures**: `t.is`/`t.deepEqual` etc.
  produce diff-rich failure output.
- **Snapshot support**: `t.snapshot()` built-in.

The per-file process isolation eliminates entire test-interference
classes that Jest/Mocha allow.

## When to use

- Library / utility / SDK projects (file-level isolation is
  high-value).
- Async-heavy code (concurrent test execution shines).
- Team prefers explicit imports over global injection.
- Migration from Mocha where parallelism matters.

For React component testing, prefer [`vitest-tests`](../vitest-tests/SKILL.md)
or [`jest-tests`](../jest-tests/SKILL.md) (ecosystem density).

## Step 1 — Install

Per [ava-gh][ava-gh]:

```bash
npm init ava
# or manually:
npm install --save-dev ava
```

## Step 2 — First test

```javascript
// test/sum.test.js
import test from 'ava';
import { sum } from '../src/sum.js';

test('adds 1 + 2 to equal 3', t => {
  t.is(sum(1, 2), 3);
});

test('async addition', async t => {
  const result = await Promise.resolve(sum(2, 3));
  t.is(result, 5);
});
```

`t` is the AVA-injected test context; assertion methods live on it
(`t.is`, `t.deepEqual`, `t.truthy`, `t.snapshot`, `t.throws`, etc.).
No global `expect` / `assert` — explicit per test.

## Step 3 — Configuration

Config lives in `package.json` `ava` key OR `ava.config.js`:

```json
// package.json
{
  "ava": {
    "files": ["test/**/*.test.js"],
    "extensions": ["js", "ts"],
    "require": ["ts-node/register"],
    "timeout": "30s",
    "concurrency": 4,
    "failFast": false,
    "verbose": true,
    "snapshotDir": "test/snapshots"
  }
}
```

For TypeScript with the `@ava/typescript` adapter:

```bash
npm install --save-dev @ava/typescript typescript
```

```json
{
  "ava": {
    "typescript": {
      "rewritePaths": { "src/": "build/" },
      "compile": "tsc"
    }
  }
}
```

## Step 4 — Concurrency model

- Each **test file** runs in its own Node worker process.
- **Tests within a file** run concurrently by default.
- Use `test.serial(...)` to force serial execution within a file:

```javascript
test.serial('this runs first', t => { /* ... */ });
test.serial('this runs second', t => { /* ... */ });
test('this runs concurrently with the next', t => { /* ... */ });
test('this runs concurrently with the previous', t => { /* ... */ });
```

For tests that share file-level state (rare, often a smell),
serial is necessary.

## Step 5 — Hooks

```javascript
test.before(async t => {
  // runs once before all tests in file
});
test.after(async t => {
  // runs once after all tests
});
test.beforeEach(async t => {
  // runs before each test
});
test.afterEach(async t => {
  // runs after each test
});

// Hooks can pass context to tests via t.context:
test.beforeEach(t => {
  t.context.user = createUser();
});
test('uses fixture', t => {
  t.is(t.context.user.id, 1);
});
```

## Step 6 — Assertion API

Common matchers (full list at [github.com/avajs/ava/blob/main/docs/03-assertions.md](https://github.com/avajs/ava/blob/main/docs/03-assertions.md)):

| Matcher | Use |
|---|---|
| `t.is(actual, expected)` | Strict equality (===) |
| `t.not(actual, expected)` | Strict inequality |
| `t.deepEqual(a, b)` | Deep value equality |
| `t.notDeepEqual(a, b)` | Inverse |
| `t.truthy(value)` / `t.falsy(value)` | Boolean coercion |
| `t.true(value)` / `t.false(value)` | Strict boolean |
| `t.throws(() => fn())` | Sync throw |
| `t.throwsAsync(async () => fn())` | Async throw |
| `t.regex(string, regex)` | Regex match |
| `t.snapshot(value)` | Snapshot test |
| `t.like(actual, partial)` | Partial structural match |

## Step 7 — Snapshot tests

```javascript
test('snapshot user profile', t => {
  const profile = renderProfile(user);
  t.snapshot(profile);
});
```

Snapshots stored under `test/snapshots/` per config (Step 3).
Update via `npx ava --update-snapshots` (or `-u`).

## Step 8 — Exclusive + skipped

```javascript
test.only('runs only this', t => { /* ... */ });
test.skip('skipped', t => { /* ... */ });
test.failing('expected to fail (TODO marker)', t => {
  t.is(1, 2);   // PASSES the test (because it's marked failing)
});
test.todo('write this test');   // marker; doesn't run
```

`test.failing` is AVA-distinctive — encodes "this test is expected
to fail" so the suite signals when the underlying bug is fixed.

## Step 9 — CI integration

```yaml
- run: npm ci
- run: npx ava --tap | npx tap-junit > junit.xml
# Or built-in TAP reporter for any TAP consumer:
- run: npx ava --reporter=tap > test-results.tap
```

AVA emits TAP by default; for JUnit XML, pipe through `tap-junit` or
similar.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Use serial tests by default | Defeats AVA's parallelism advantage | Default concurrent; serial only when needed (Step 4) |
| Share state across test files | File-level process isolation breaks the assumption | Per-file fixture setup (Step 5) |
| Use `t.true(myArr.includes(x))` instead of `t.true(myArr.includes(x))` with assertion-specific matcher | Generic boolean assertion gives poor failure message | Use specific matchers (Step 6) |
| Commit `test.only` | Suite runs only the .only tests | Lint rule `ava/no-only-test` |
| Use `done` callback pattern | AVA doesn't have one; tests hang | Use async/await or return a promise |

## Limitations

- Per-file process isolation has memory + spinup cost at scale
  (1000s of files).
- Some Node native modules don't survive process boundaries
  cleanly.
- React component testing requires `@ava/babel` + `jsdom`; less
  ergonomic than Jest/Vitest.
- Mocking story is "use a separate mocking library" (sinon, jest's
  vi.fn equivalent); no built-in mocks.

## References

- [ava-gh][ava-gh] — repository, install, basic usage
- github.com/avajs/ava/tree/main/docs — full documentation
- github.com/avajs/ava/blob/main/docs/03-assertions.md — assertion API
- github.com/avajs/typescript — @ava/typescript adapter
- [`jest-tests`](../jest-tests/SKILL.md),
  [`vitest-tests`](../vitest-tests/SKILL.md),
  [`mocha-tests`](../mocha-tests/SKILL.md),
  [`jasmine-tests`](../jasmine-tests/SKILL.md) — sister tools
- [`test-code-conventions`](../../qa-test-review/skills/test-code-conventions/SKILL.md)
  — cross-plugin: test code hygiene
