---
name: jest-tests
description: "Configures and runs Jest - Meta-built batteries-included JS/TS unit framework with built-in `expect`, snapshot testing, mocking (`jest.mock`, `jest.fn`, `jest.spyOn`, manual `__mocks__/`), test environment selection (`jsdom` / `node`), parallel workers, coverage via Istanbul, watch mode, and CI integration via `--ci` flag. Use when the user works with React (CRA / older Next.js) or Node services and needs the most ecosystem-supported JS test framework."
---

# jest-tests

## Overview

Per [jestjs.io/docs/getting-started][jest-start]:

[jest-start]: https://jestjs.io/docs/getting-started

Jest is "a delightful JavaScript Testing Framework with a focus on
simplicity." It bundles `expect` assertions, snapshot testing,
mocking (no separate Sinon needed), and code coverage in one tool.
Works with TypeScript via `babel-jest` (faster) or `ts-jest` (full
type-checking).

This skill targets **per-framework lifecycle** (configure / run /
mock / coverage / CI) - NOT test code hygiene patterns. For
hygiene (assertion quality / AAA structure / mocking anti-patterns),
see `test-code-conventions`; test code is reviewed separately.

## When to use

- The repo has `jest.config.js`, `jest.config.ts`, or `jest` key in
  package.json.
- The team works with React (CRA legacy + many React Native projects)
  or Node services.
- Need built-in mocking + snapshot testing without external libs.
- Migrating from a fragmented Mocha + Chai + Sinon + nyc setup.

For Vite-based projects, prefer `vitest-tests`
(Vite-native; faster transform-pipeline reuse).

## How to use

1. Confirm Jest fits (React CRA / React Native / Node service, or a
   fragmented Mocha + Chai + Sinon setup to consolidate); for Vite projects
   prefer `vitest-tests`.
2. Install `jest` (add `ts-jest` or `babel-jest` for TypeScript) and scaffold
   config with `npm init jest@latest`.
3. Write `*.test.js` / `*.spec.js` files using `expect` matchers; wire
   `"test": "jest"` and run `npm test`.
4. Replace collaborators with `jest.fn` / `jest.mock` / `jest.spyOn` and
   control time with fake timers (see Mocking).
5. Set `testEnvironment` explicitly and add `coverageThreshold` to gate
   coverage; run `jest --coverage` (see Configuration and Coverage, CI, and ESLint).
6. In CI run `npx jest --ci --maxWorkers=2` with `jest-junit` for JUnit XML
   (see Coverage, CI, and ESLint).

## Step 1 - Install

Per [jest-start][jest-start]:

```bash
npm install --save-dev jest
# or yarn add --dev jest / pnpm add --save-dev jest / bun add --dev jest
```

For TypeScript, choose one:

```bash
# Option A: ts-jest (full type-checking; slower)
npm install --save-dev ts-jest

# Option B: babel-jest (faster; type errors NOT caught - pair with tsc --noEmit in CI)
npm install --save-dev babel-jest @babel/core @babel/preset-env @babel/preset-typescript
```

Per [jest-start][jest-start] babel.config.js for TS via Babel:

```javascript
module.exports = {
  presets: [
    ['@babel/preset-env', {targets: {node: 'current'}}],
    '@babel/preset-typescript',
  ],
};
```

For type definitions, prefer the bundled `@jest/globals`:

```bash
npm install --save-dev @jest/globals
```

Then import explicitly per [jest-start][jest-start]:

```typescript
import {describe, expect, test} from '@jest/globals';
import {sum} from './sum';
```

This avoids global pollution + is the modern recommendation.

## Step 2 - First test

Per [jest-start][jest-start]:

```javascript
// sum.js
function sum(a, b) {
  return a + b;
}
module.exports = sum;
```

```javascript
// sum.test.js
const sum = require('./sum');

test('adds 1 + 2 to equal 3', () => {
  expect(sum(1, 2)).toBe(3);
});
```

Wire `package.json`:

```json
{
  "scripts": {
    "test": "jest"
  }
}
```

Run via `npm test`.

## Worked example

A Node service function `getUser(id)` calls `fetchUser` from `./api-client`;
verify it without a live API.

```javascript
// user-service.test.js
import { getUser } from './user-service';
import { fetchUser } from './api-client';

jest.mock('./api-client');

test('returns the fetched user', async () => {
  fetchUser.mockResolvedValue({ id: 1, name: 'Alice' });
  await expect(getUser(1)).resolves.toEqual({ id: 1, name: 'Alice' });
  expect(fetchUser).toHaveBeenCalledWith(1);
});
```

Run `npm test`. `jest.mock('./api-client')` auto-replaces the module so no
network call fires; the test passes when `getUser` forwards the id and returns
the resolved user.

## Configuration

`npm init jest@latest` scaffolds a config. Key gotcha: `testEnvironment`
defaults to `jsdom` in Jest 26 and earlier but `node` from Jest 27+, so set it
explicitly. The full `jest.config.js` reference (coverage collection,
`moduleNameMapper` path aliases, `transform`) is in
[references/configuration.md](references/configuration.md).

## Mocking

Jest ships mocking without a separate Sinon: `jest.fn()` (standalone),
`jest.mock('./module')` (automatic module mock), `jest.spyOn(obj, 'method')`
(wrap an existing method), manual mocks in `__mocks__/`, and fake timers
(`jest.useFakeTimers`). Patterns and timer control are in
[references/mocking.md](references/mocking.md).

## Coverage, CI, and ESLint

Run `jest --coverage` (Istanbul) and gate via `coverageThreshold`. In CI,
`--ci` fails on missing snapshots instead of writing them and disables
interactive prompts; pair with `--maxWorkers=2` on hosted runners and
`jest-junit` for JUnit XML. The coverage config, GitHub Actions workflow, and
ESLint test-globals setup are in
[references/coverage-ci-eslint.md](references/coverage-ci-eslint.md).

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `jest.mock` at top of file without specific test scope | Module mock leaks across tests; brittle | `jest.doMock` per-test or move to `__mocks__/` (see Mocking) |
| `--watchAll` in CI | Hangs forever | Use `--ci` (see Coverage, CI, and ESLint) |
| Snapshot-only assertions | Tests pass on every change without semantic verification | Targeted `expect()` for invariants; snapshots for stable shape only |
| Skip `--maxWorkers` config in CI | Default = #cores; can OOM CI runners | Pin `--maxWorkers=2` for typical hosted CI (see Coverage, CI, and ESLint) |
| Run TypeScript via babel-jest without separate `tsc --noEmit` | Type errors silently bypass tests | Pair babel-jest with tsc --noEmit in CI (Step 1) |

## Limitations

- Slower than `vitest-tests` on
  Vite-based projects (Jest doesn't share dev-server transform).
- Snapshot testing brittle at scale; pair with `jest-image-snapshot`
  for visual snapshots.
- ESM (ECMAScript Modules) support has rough edges - many projects
  still use CommonJS for tests.
- Module hoisting (`jest.mock` at top of file) has subtle ordering
  semantics; test code hygiene addressed in qa-test-review.

## References

- [jest-start][jest-start] - install, basic patterns, TS, ESLint
- jestjs.io/docs/configuration - full config reference
- jestjs.io/docs/cli - CLI reference incl. `--ci`
- jestjs.io/docs/mock-functions - mocking deep dive
- jestjs.io/docs/configuration#coverageThreshold-object - coverage gating
- `vitest-tests`,
  `mocha-tests`,
  `ava-tests`,
  `jasmine-tests` - sister tools
- `test-code-conventions` (qa-test-review) - test code hygiene (separate from per-framework
  lifecycle)
