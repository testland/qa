---
name: js-unit-tests
description: "JavaScript/TypeScript unit testing with Jest and Vitest as co-primary frameworks - install, config (`jest.config.js` / `vite.config.ts` test block), mocking (`jest.fn`/`jest.mock`/`jest.spyOn`, `vi.fn`/`vi.mock`/`vi.spyOn`, `__mocks__/`, fake timers), coverage (Istanbul/babel vs v8 providers, `coverageThreshold` gating), watch mode, and CI (`jest --ci`, `vitest run`, JUnit XML). Includes framework choice (Vite project → Vitest, otherwise Jest; always match an existing convention), test-authoring conventions (framework detection from package.json + config files, ESM vs CJS, no fabricated exports), and references for Mocha maintenance, Jasmine/Karma-to-Jest migration via jest-codemods, and deep Jest/Vitest coverage analysis. Use for any JS/TS unit-test task: setting up a framework, writing or mocking tests, gating coverage, or wiring CI."
---

# js-unit-tests

## Overview

The two mainstream JS/TS unit frameworks share one Jest-shaped API and split
by build tool:

- **Jest** ([jestjs.io/docs/getting-started][jest-start]) - Meta-built,
  batteries-included: `expect` matchers, snapshot testing, mocking
  (`jest.fn` / `jest.mock` / `jest.spyOn`), and Istanbul coverage in one
  package. Home turf: React (CRA / older Next.js), React Native, Node
  services.
- **Vitest** ([vitest.dev/guide][vt-guide]) - Vite-native: "Vitest reads
  your `vite.config.*` by default, so your existing Vite plugins and
  configuration work out-of-the-box." Jest-compatible API (`expect`,
  `vi.fn`, `vi.mock`), native ESM, in-source testing, browser mode.

[jest-start]: https://jestjs.io/docs/getting-started
[vt-guide]: https://vitest.dev/guide/

This skill targets the per-framework lifecycle (configure / run / mock /
coverage / CI), NOT test code hygiene - for assertion quality, AAA structure,
and mocking anti-patterns see `test-code-conventions` (qa-test-review).

## Choosing a framework

1. **Match the existing convention first.** A repo with `jest.config.*` (or a
   `"jest"` package.json block) stays on Jest; one with `vitest.config.*` or a
   `test` block in `vite.config.*` stays on Vitest. Never mix two unit
   frameworks in one package.
2. **New code in a Vite project** (Vue, Svelte, Solid, Astro, modern React
   with Vite) → **Vitest**: it reuses the already-configured Vite transform
   pipeline where Jest needs separate `babel-jest` / `ts-jest` setup.
3. **Otherwise** (bundler-free Node service, React Native, CRA legacy) →
   **Jest**: the most ecosystem-supported choice.
4. **Legacy runners**: maintaining a Mocha codebase →
   [references/mocha.md](references/mocha.md); maintaining or migrating a
   Jasmine / Karma codebase →
   [references/legacy-migration.md](references/legacy-migration.md).

## Step 1 - Install

Jest, per [jest-start][jest-start]:

```bash
npm install --save-dev jest
# TypeScript - choose one:
npm install --save-dev ts-jest        # full type-checking; slower
npm install --save-dev babel-jest @babel/core @babel/preset-env @babel/preset-typescript
npm install --save-dev @jest/globals  # explicit imports instead of globals
```

babel-jest does NOT catch type errors - pair it with `tsc --noEmit` in CI.
Scaffold config with `npm init jest@latest`.

Vitest, per [vt-guide][vt-guide]:

```bash
npm install -D vitest
```

If the project already has Vite + a `vite.config.*`, no extra config is
needed.

## Step 2 - First test

```javascript
// sum.test.js (Jest - globals available by default)
const sum = require('./sum');

test('adds 1 + 2 to equal 3', () => {
  expect(sum(1, 2)).toBe(3);
});
```

```javascript
// sum.test.js (Vitest - explicit imports required)
import { expect, test } from 'vitest'
import { sum } from './sum.js'

test('adds 1 + 2 to equal 3', () => {
  expect(sum(1, 2)).toBe(3)
})
```

Wire `package.json` scripts:

```json
{
  "scripts": {
    "test": "jest"
  }
}
```

or for Vitest - `vitest` with no subcommand is watch mode; `vitest run` is
the single pass:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "coverage": "vitest run --coverage"
  }
}
```

## Step 3 - Configuration

Jest key settings (`jest.config.js`; full reference at
jestjs.io/docs/configuration):

```javascript
module.exports = {
  testEnvironment: 'jsdom',          // 'jsdom' for browser code; 'node' for backend
  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
  transform: { '^.+\\.(ts|tsx)$': 'ts-jest' },
  collectCoverageFrom: ['src/**/*.{js,ts}', '!src/**/*.d.ts'],
  coverageThreshold: {
    global: { branches: 80, functions: 80, lines: 80, statements: 80 },
  },
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },  // match tsconfig aliases
};
```

Gotcha: `testEnvironment` defaults to `jsdom` in Jest ≤26 but `node` from
Jest 27+ - always set it explicitly.

Vitest reads `vite.config.ts`; add a `test` block via the `vitest/config`
wrapper (full reference at vitest.dev/config):

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',       // 'jsdom' | 'node' | 'happy-dom' | 'edge-runtime'
    globals: false,             // prefer explicit imports over global injection
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',           // 'v8' (default) | 'istanbul'
      reporter: ['text', 'json', 'html', 'lcov'],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
      include: ['src/**'],
    },
  },
})
```

## Step 4 - Mocking

Same three mock forms in both frameworks - `jest.*` in Jest, `vi.*` in
Vitest (vitest.dev/api/vi; jestjs.io/docs/mock-functions):

```javascript
// Standalone mock function
const myMock = jest.fn();            // Vitest: vi.fn()
myMock.mockReturnValue(42);

// Automatic module mock
jest.mock('./api-client');           // Vitest: vi.mock('./api-client', factory)
import { fetchUser } from './api-client';
fetchUser.mockResolvedValue({ id: 1, name: 'Alice' });

// Wrap an existing method
const spy = jest.spyOn(myObject, 'someMethod')   // Vitest: vi.spyOn(...)
  .mockImplementation(() => 'mocked');
spy.mockRestore();
```

Jest manual mocks live in `__mocks__/` adjacent to the module and are used
automatically when `jest.mock('./api-client')` runs.

Fake timers (identical shape; `jest-fake-timers` in qa-time owns selective
faking, DST/timezone cases, and timers combined with mocked `fetch`):

```javascript
jest.useFakeTimers();                // Vitest: vi.useFakeTimers()
setTimeout(callback, 1000);
jest.advanceTimersByTime(1000);      // Vitest: vi.advanceTimersByTime(1000)
expect(callback).toHaveBeenCalled();
jest.useRealTimers();                // Vitest: vi.useRealTimers()
```

Worked example - a Node service function `getUser(id)` calls `fetchUser`
from `./api-client`; verify without a live API:

```javascript
import { getUser } from './user-service';
import { fetchUser } from './api-client';

jest.mock('./api-client');

test('returns the fetched user', async () => {
  fetchUser.mockResolvedValue({ id: 1, name: 'Alice' });
  await expect(getUser(1)).resolves.toEqual({ id: 1, name: 'Alice' });
  expect(fetchUser).toHaveBeenCalledWith(1);
});
```

Vitest-only gotcha: a `vi.mock(...)` factory is hoisted above imports, so
references to module-scope variables leak as `undefined` - move state inside
the factory closure or use `vi.hoisted()` ([vt-guide][vt-guide]).

## Step 5 - Coverage

Both frameworks use the same Istanbul / V8 provider stack:

```bash
npx jest --coverage
npx vitest run --coverage
```

Jest's `coverageProvider` is `babel` (Istanbul instrumentation, default) or
`v8` (native, faster, subtler source-map edge cases); Vitest defaults to
`v8`. Gate via `coverageThreshold` (Jest) / `coverage.thresholds` (Vitest) -
the run fails when a threshold is not met. The pattern that keeps gates
honest: lower the global floor, raise the critical paths per-file, and always
set `collectCoverageFrom` / `coverage.include` so untested files count in the
denominator.

Deep coverage work - provider trade-offs, per-file threshold rules, reporter
selection (`lcov` for SaaS, `text-summary` for CI logs), parsing
`coverage-final.json` for PR deltas, and the coverage-gate anti-pattern
catalog - is in [references/jest-coverage.md](references/jest-coverage.md).

## Step 6 - Watch mode and CI

Local: `jest --watch` / bare `vitest` re-run affected tests on change.

CI must run single-pass:

```yaml
- run: npm ci
- run: npx jest --ci --coverage --maxWorkers=2 --reporters=default --reporters=jest-junit
# or
- run: npx vitest run --coverage --reporter=verbose --reporter=junit --outputFile=junit.xml
- uses: codecov/codecov-action@v4
  with: { files: ./coverage/lcov.info }
```

- Jest `--ci` fails on missing snapshots instead of writing them and
  disables interactive prompts (jestjs.io/docs/cli); `--maxWorkers=2` suits
  2-CPU hosted runners (default = all cores, which can OOM CI).
- `vitest run` is required - bare `vitest` enters watch mode and hangs CI.
- JUnit XML (`jest-junit` / Vitest's `junit` reporter) feeds
  `junit-xml-analysis` in qa-test-reporting.
- `vitest run --typecheck` runs `tsc --noEmit` against test files alongside
  the run; without it, type errors in tests don't fail CI.

## Authoring conventions

When authoring a new unit test in an existing project:

1. **Detect the framework, never assume.** `jest` in devDependencies OR
   `jest.config.*` OR a `"jest"` package.json block → Jest; `vitest` in
   devDependencies OR `vitest.config.*` OR a `test` block in `vite.config.*`
   → Vitest; `mocha` / `.mocharc.*` → Mocha; `jasmine` /
   `spec/support/jasmine.json` → Jasmine. If two frameworks' signals
   coexist, stop and ask which one to use.
2. **Match the module system.** `"type": "module"` or `.mjs` → ESM
   `import`; otherwise CommonJS `require`. TS source + tsconfig → emit
   `.test.ts`.
3. **Follow the placement convention.** Existing `__tests__/` dir →
   `__tests__/<name>.test.<ext>`; otherwise co-locate next to the source.
4. **One spec → one new test file**; never modify existing test methods and
   never fabricate exports the target module does not declare.
5. **Assert the spec's concrete outcome** - no `expect(true).toBe(true)`
   smoke asserts.
6. **Pair with present dev-deps only**: `@faker-js/faker` in deps → use it
   for domain-shaped fixtures (`faker-data` in qa-test-data); `msw` in deps →
   mock HTTP at the network layer via `msw-handlers` (qa-test-data) instead
   of `jest.fn()`-ing the fetch layer. Never install new packages as a side
   effect of writing a test.
7. **`await` the call under test** in async tests - an `async` test body
   with no `await` resolves before the rejection surfaces and passes
   silently.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `--watchAll` / bare `vitest` in CI | Watch mode hangs the runner forever | `jest --ci` / `vitest run` (Step 6) |
| Snapshot-only assertions | Pass on every change without semantic verification | Targeted `expect()` for invariants; snapshots for stable shape only |
| Default worker count in CI | Jest default = all cores; can OOM hosted runners | Pin `--maxWorkers=2` (Step 6) |
| babel-jest without `tsc --noEmit` | Type errors silently bypass tests | Separate type-check step in CI (Step 1) |
| `globals: true` in Vitest config | Global injection; harder to type | Explicit `import { test, expect } from 'vitest'` (Step 3) |
| `jest.mock` leaking across tests | Module mock persists; brittle ordering | `jest.doMock` per-test or manual `__mocks__/` (Step 4) |
| In-source Vitest tests for non-trivial logic | Hard to grep; mixed with prod code | Separate `*.test.ts` files; in-source only for tiny utilities |

## Limitations

- Jest ESM support has rough edges; many projects keep CommonJS for tests.
  Vitest is ESM-native but CommonJS-only projects need migration or Jest.
- Snapshot formats differ slightly between Jest and Vitest; migrating
  snapshots needs care.
- Vitest browser mode is newer; some matchers behave differently in browser
  vs jsdom environments.
- Jest module hoisting (`jest.mock` at top of file) has subtle ordering
  semantics.

## References

- [jest-start][jest-start] - Jest install, basic patterns, TS, ESLint
- jestjs.io/docs/configuration - Jest config reference
- jestjs.io/docs/cli - Jest CLI incl. `--ci`
- jestjs.io/docs/mock-functions - Jest mocking deep dive
- [vt-guide][vt-guide] - Vitest getting started
- vitest.dev/config - Vitest config reference
- vitest.dev/api/vi - `vi.*` API reference
- [references/mocha.md](references/mocha.md) - Mocha runner maintenance
- [references/legacy-migration.md](references/legacy-migration.md) -
  Jasmine/Karma-to-Jest migration
- [references/jest-coverage.md](references/jest-coverage.md) - deep
  Jest/Vitest coverage analysis
- `test-code-conventions` (qa-test-review) - test code hygiene
