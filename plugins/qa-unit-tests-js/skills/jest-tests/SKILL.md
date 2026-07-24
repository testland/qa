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

## Step 3 - Configuration

Generate config (per [jest-start][jest-start]):

```bash
npm init jest@latest
```

Common `jest.config.js` settings:

```javascript
module.exports = {
  testEnvironment: 'jsdom',          // 'jsdom' for browser; 'node' for backend
  setupFilesAfterEach: ['<rootDir>/jest.setup.js'],
  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  collectCoverageFrom: ['src/**/*.{js,ts}', '!src/**/*.d.ts'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',  // path aliases matching tsconfig
  },
};
```

`testEnvironment` defaults to `jsdom` in Jest 26 and earlier; from
Jest 27+ defaults to `node`. Set explicitly to avoid surprise.

## Step 4 - Mocking patterns (per-framework lifecycle)

Three forms:

```javascript
// jest.fn() - standalone mock function
const myMock = jest.fn();
myMock.mockReturnValue(42);
expect(myMock(5)).toBe(42);
expect(myMock).toHaveBeenCalledWith(5);

// jest.mock('./module') - automatic module mock
jest.mock('./api-client');
import { fetchUser } from './api-client';
fetchUser.mockResolvedValue({ id: 1, name: 'Alice' });

// jest.spyOn(obj, 'method') - wrap existing method
const spy = jest.spyOn(myObject, 'someMethod')
  .mockImplementation(() => 'mocked');
expect(myObject.someMethod()).toBe('mocked');
spy.mockRestore();
```

Manual mocks live in `__mocks__/` adjacent to the module:

```
src/
  api-client.js
  __mocks__/
    api-client.js   # automatically used when jest.mock('./api-client') runs
```

Timer mocks:

```javascript
jest.useFakeTimers();
setTimeout(callback, 1000);
jest.advanceTimersByTime(1000);
expect(callback).toHaveBeenCalled();
jest.useRealTimers();
```

## Step 5 - Coverage

```bash
jest --coverage
```

Output formats: text, lcov, html, json, json-summary. Configure via
`coverageReporters` in `jest.config.js`. The `coverageThreshold`
field (Step 3) fails the run if coverage drops below thresholds.

For the `coverageThreshold` per-file pattern:

```javascript
coverageThreshold: {
  './src/critical-module/': {
    branches: 95,
    statements: 95,
  },
  './src/legacy/': {
    branches: 50,
  },
},
```

## Step 6 - CI integration

Per Jest CLI, `--ci` flag is critical for CI runs:

```yaml
# .github/workflows/test.yml
- run: npm ci
- run: npx jest --ci --coverage --maxWorkers=2 --reporters=default --reporters=jest-junit
- uses: codecov/codecov-action@v4
  with: { files: ./coverage/lcov.info }
```

`--ci` semantics:
- Disables snapshot writing on missing snapshots (fails instead - prevents accidental snapshot generation in CI)
- Disables interactive prompts
- Equivalent to `process.env.CI=true`

`--maxWorkers=2` is typical for GitHub-hosted runners (2 CPUs); tune
per runner specs.

For JUnit XML output (consumable by `junit-xml-analysis` in qa-test-reporting):

```bash
npm install --save-dev jest-junit
JEST_JUNIT_OUTPUT_FILE=./test-results/junit.xml \
  jest --ci --reporters=default --reporters=jest-junit
```

## Step 7 - ESLint integration

Per [jest-start][jest-start]:

```javascript
// eslint.config.js
import {defineConfig} from 'eslint/config';
import globals from 'globals';

export default defineConfig([
  {
    files: ['**/*.test.js', '**/*.spec.js'],
    languageOptions: {
      globals: { ...globals.jest },
    },
  },
]);
```

Or via `eslint-plugin-jest`:

```bash
npm install --save-dev eslint-plugin-jest
```

```json
{
  "overrides": [{
    "files": ["**/*.test.js", "**/*.spec.js"],
    "plugins": ["jest"],
    "extends": ["plugin:jest/recommended"]
  }]
}
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `jest.mock` at top of file without specific test scope | Module mock leaks across tests; brittle | `jest.doMock` per-test or move to `__mocks__/` (Step 4) |
| `--watchAll` in CI | Hangs forever | Use `--ci` (Step 6) |
| Snapshot-only assertions | Tests pass on every change without semantic verification | Targeted `expect()` for invariants; snapshots for stable shape only |
| Skip `--maxWorkers` config in CI | Default = #cores; can OOM CI runners | Pin `--maxWorkers=2` for typical hosted CI (Step 6) |
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
