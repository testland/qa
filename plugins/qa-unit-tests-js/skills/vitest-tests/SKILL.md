---
name: vitest-tests
description: "Configures and runs Vitest - Vite-native unit framework with Jest-compatible API (`expect`, `vi.fn`, `vi.mock`, `vi.spyOn`); reads `vite.config.*` so existing Vite plugins work; supports in-source testing via `if (import.meta.vitest)`, browser-mode UI for headed tests, type-checking via `vitest --typecheck`, native ESM, and coverage via v8 (default) or istanbul providers. Use when the user works with Vite-based projects (Vue, Svelte, Solid, modern React with Vite) or wants Jest-compatible API with faster Vite-native runs."
rating: 24
d6: 4
archetype: S1
---

# vitest-tests

## Overview

Per [vitest.dev/guide][vt-guide]:

[vt-guide]: https://vitest.dev/guide/

Vitest is the Vite-native test framework. The model:

> "Vitest reads your `vite.config.*` by default, so your existing
> Vite plugins and configuration work out-of-the-box."

This is the differentiator vs Jest - Jest needs separate
`babel-jest`/`ts-jest` transform setup; Vitest reuses Vite's
already-configured pipeline. Same code transforms in dev + test.

API is intentionally Jest-compatible (`expect`, `describe`, `it` /
`test`, `vi.fn`, `vi.mock`) - migration from Jest is mostly mechanical.

## When to use

- The repo uses Vite (Vue, Svelte, Solid, Astro, modern React).
- Migration from Jest where the team wants faster runs + ESM-native.
- New JS/TS project starting from scratch (Vitest is the modern
  default for greenfield).
- In-source testing pattern (tests colocated with implementation
  via `if (import.meta.vitest)`) is desired.

## Step 1 - Install

Per [vt-guide][vt-guide]:

```bash
npm install -D vitest
```

If the project already has Vite + a `vite.config.*` file, no
additional config needed.

## Step 2 - First test

Per [vt-guide][vt-guide]:

```javascript
// sum.js
export function sum(a, b) { return a + b; }
```

```javascript
// sum.test.js
import { expect, test } from 'vitest'
import { sum } from './sum.js'

test('adds 1 + 2 to equal 3', () => {
  expect(sum(1, 2)).toBe(3)
})
```

Wire `package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "coverage": "vitest run --coverage"
  }
}
```

`vitest` (no subcommand) defaults to watch mode; `vitest run` is the
single-pass run.

## Step 3 - Configuration

Vitest reads `vite.config.ts` by default. For Vitest-specific options:

```typescript
// vite.config.ts
import { defineConfig } from 'vitest/config'   // note: vitest/config wrapper

export default defineConfig({
  test: {
    environment: 'jsdom',           // 'jsdom' (browser-like) | 'node' | 'happy-dom' | 'edge-runtime'
    globals: false,                  // import {test, expect} explicitly (recommended) vs global injection
    include: ['**/*.test.{js,ts}', '**/*.spec.{js,ts}'],
    exclude: ['node_modules', 'dist'],
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',                // 'v8' (default; native) | 'istanbul'
      reporter: ['text', 'json', 'html', 'lcov'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
      include: ['src/**'],
      exclude: ['**/*.test.ts', '**/types.ts'],
    },
  },
})
```

`provider: 'v8'` is Vitest's default; `istanbul` is more accurate
for branch coverage but slower.

## Step 4 - Mocking (Jest-compatible API)

```javascript
import { vi, expect, test } from 'vitest';

// vi.fn() — standalone mock
const myMock = vi.fn();
myMock.mockReturnValue(42);

// vi.mock() — module mock (hoisted to top of file)
vi.mock('./api-client', () => ({
  fetchUser: vi.fn().mockResolvedValue({ id: 1 }),
}));

// vi.spyOn() — wrap existing method
const spy = vi.spyOn(myObject, 'someMethod');
```

Timer mocks:

```javascript
vi.useFakeTimers();
setTimeout(callback, 1000);
vi.advanceTimersByTime(1000);
expect(callback).toHaveBeenCalled();
vi.useRealTimers();
```

Migration from Jest: replace `jest.` with `vi.` (mostly mechanical).

## Step 5 - In-source testing

Vitest's distinguishing feature - tests live in the implementation
file:

```typescript
// sum.ts
export function sum(a: number, b: number): number {
  return a + b;
}

if (import.meta.vitest) {
  const { test, expect } = import.meta.vitest;
  test('adds', () => {
    expect(sum(1, 2)).toBe(3);
  });
}
```

Enable in config:

```typescript
test: {
  includeSource: ['src/**/*.{js,ts}'],
}
```

In production builds, the `if (import.meta.vitest)` block is
tree-shaken away. Useful for tiny utility files where separate test
files feel like overkill - but mainstream test suites should use
separate files for greppability.

## Step 6 - Browser mode

For tests that need real browser APIs (vs jsdom approximations):

```bash
npm install -D @vitest/browser playwright
```

```typescript
// vite.config.ts
test: {
  browser: {
    enabled: true,
    name: 'chromium',     // 'chromium' | 'firefox' | 'webkit'
    provider: 'playwright',
    headless: true,
  },
}
```

Tests run in a real browser instance; tradeoff is speed vs fidelity.
For DOM-only assertions, jsdom is faster; for CSS layout / Web API
correctness, browser mode catches more.

## Step 7 - Type-checking integration

```bash
vitest run --typecheck
```

Runs `tsc --noEmit` against test files alongside the test run.
Without `--typecheck`, TypeScript type errors in tests don't fail
the run.

## Step 8 - Coverage

```bash
vitest run --coverage
```

Output formats configured in `coverage.reporter` (Step 3).

## Step 9 - CI integration

```yaml
- run: npm ci
- run: npx vitest run --coverage --reporter=verbose --reporter=junit --outputFile=junit.xml
- uses: codecov/codecov-action@v4
  with: { files: ./coverage/lcov.info }
```

`vitest run` (not `vitest`) is required in CI - without `run`,
Vitest enters watch mode and hangs the runner.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `vitest` (no subcommand) in CI | Enters watch mode; CI hangs | `vitest run` (Step 9) |
| `globals: true` in config | Jest-style global injection; harder to type | Explicit `import { test, expect } from 'vitest'` (Step 3) |
| In-source tests for non-trivial logic | Hard to grep, mixed with prod code | Separate `*.test.ts` files for non-trivial (Step 5) |
| Skip `--typecheck` in CI | Type errors in tests bypass | `--typecheck` flag (Step 7) |
| Use `provider: 'istanbul'` by default | Slower than v8 with no benefit for line coverage | Default `v8` (Step 3) |

## Limitations

- ESM-native; CommonJS-only projects need migration or Jest.
- Browser-mode is newer; some matchers don't work identically in
  browser vs jsdom environments.
- Snapshot format differs slightly from Jest; migrating snapshots
  needs care.
- In-source testing is a power feature; over-use harms code
  readability.

## References

- [vt-guide][vt-guide] - getting started
- vitest.dev/config - full config reference
- vitest.dev/api/vi - vi.* API reference
- vitest.dev/guide/in-source - in-source testing
- vitest.dev/guide/browser - browser mode
- [`jest-tests`](../jest-tests/SKILL.md),
  [`mocha-tests`](../mocha-tests/SKILL.md),
  [`ava-tests`](../ava-tests/SKILL.md),
  [`jasmine-tests`](../jasmine-tests/SKILL.md) - sister tools
- [`test-code-conventions`](../../qa-test-review/skills/test-code-conventions/SKILL.md) - cross-plugin: test code hygiene
