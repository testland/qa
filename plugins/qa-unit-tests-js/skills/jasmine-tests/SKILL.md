---
name: jasmine-tests
description: "Configures and runs Jasmine - the original BDD-style JS test framework (predecessor to Jest) with built-in matchers + spies, no external assertion library; ships `jasmine-core` + `jasmine` runner; `spec_dir` + `helpers` convention; `jasmine.json` config; spy patterns (`spyOn`, `createSpy`); pairs with Karma for in-browser testing. Use when the user maintains legacy AngularJS / Karma+Jasmine codebases, or wants minimal BDD-style tests with no third-party assertion library."
---

# jasmine-tests

## Overview

Per [jasmine.github.io/pages/getting_started.html][jas-start]:

[jas-start]: https://jasmine.github.io/pages/getting_started.html

Jasmine (~2010) is the original BDD-style JS test framework. Most
of Jest's API descends from Jasmine - `describe`, `it`,
`beforeEach`, `expect(...).toBe(...)`, spies - were all Jasmine
patterns first.

Modern usage:
- **Legacy AngularJS apps** standardized on Jasmine + Karma.
- **Migration cases** from Jasmine to Jest (mostly mechanical).
- **Minimal-deps** projects that want no external matcher libraries.

For new browser-side projects, prefer `vitest-tests`
or `jest-tests`. This skill covers the
maintenance use case + the migration path.

## When to use

- Existing Karma + Jasmine setup the team isn't ready to migrate.
- Legacy AngularJS (1.x) project (Karma + Jasmine is the official
  Angular CLI default until very recent versions).
- Minimal-dependency requirement (no separate Chai / Sinon).

## Step 1 - Install

```bash
npm install --save-dev jasmine
npx jasmine init
```

`init` creates `spec/support/jasmine.json`:

```json
{
  "spec_dir": "spec",
  "spec_files": [
    "**/*[sS]pec.js"
  ],
  "helpers": [
    "helpers/**/*.js"
  ],
  "stopSpecOnExpectationFailure": false,
  "random": true
}
```

## Step 2 - First test

```javascript
// spec/sumSpec.js
const { sum } = require('../src/sum');

describe('sum', () => {
  it('adds 1 + 2 to equal 3', () => {
    expect(sum(1, 2)).toBe(3);
  });
});
```

Wire `package.json`:

```json
{
  "scripts": {
    "test": "jasmine"
  }
}
```

## Step 3 - Built-in matchers

Per jasmine.github.io/api/edge/matchers.html:

| Matcher | Use |
|---|---|
| `toBe(expected)` | Strict equality (===) |
| `toEqual(expected)` | Deep equality |
| `toBeTruthy()` / `toBeFalsy()` | Boolean coercion |
| `toBeGreaterThan(n)` / `toBeLessThan(n)` | Numeric comparison |
| `toBeCloseTo(n, precision)` | Float comparison |
| `toContain(substring)` | String / array containment |
| `toMatch(regex)` | Regex match |
| `toThrow()` / `toThrowError(...)` | Sync throw |
| `toBeInstanceOf(Class)` | Type check |
| `toBeDefined()` / `toBeUndefined()` / `toBeNull()` | Existence |

No need for Chai's `expect(x).to.equal(y)` style - Jasmine's
matchers are first-class.

## Step 4 - Spies (built-in mocking)

```javascript
describe('user service', () => {
  it('calls api on save', () => {
    spyOn(api, 'post').and.returnValue(Promise.resolve({ id: 1 }));
    userService.save(user);
    expect(api.post).toHaveBeenCalledWith('/users', user);
  });

  it('standalone spy', () => {
    const spy = jasmine.createSpy('callback');
    eventEmitter.on('save', spy);
    eventEmitter.emit('save');
    expect(spy).toHaveBeenCalled();
  });
});
```

Spy methods:

| Method | Effect |
|---|---|
| `spyOn(obj, 'method')` | Replace method with spy; returns `undefined` by default |
| `.and.returnValue(value)` | Configure return |
| `.and.callFake(fn)` | Custom implementation |
| `.and.callThrough()` | Spy + delegate to real impl |
| `jasmine.createSpy(name)` | Standalone spy |
| `jasmine.createSpyObj(name, ['m1', 'm2'])` | Object with multiple spies |

## Step 5 - Async patterns

```javascript
// async/await (Jasmine 3.x+)
it('async test', async () => {
  const result = await fetchData();
  expect(result).toBe('expected');
});

// Promise return (Jasmine 2.x+)
it('promise test', () => {
  return fetchData().then(result => {
    expect(result).toBe('expected');
  });
});

// Done callback (legacy)
it('callback test', (done) => {
  fetchData((err, result) => {
    expect(result).toBe('expected');
    done();
  });
});
```

## Step 6 - Hooks

```javascript
describe('User service', () => {
  beforeAll(() => { /* once before all */ });
  afterAll(() => { /* once after all */ });
  beforeEach(() => { /* before each spec */ });
  afterEach(() => { /* after each spec */ });
});
```

Same pattern as Jest / Vitest.

## Step 7 - Karma integration (browser tests)

For browser-environment tests (legacy Angular CLI default):

```bash
npm install --save-dev karma karma-jasmine karma-chrome-launcher
```

`karma.conf.js`:

```javascript
module.exports = function(config) {
  config.set({
    frameworks: ['jasmine'],
    files: ['src/**/*.spec.js'],
    browsers: ['ChromeHeadless'],
    singleRun: true,
    reporters: ['progress', 'junit'],
  });
};
```

```bash
npx karma start
```

**Important migration note:** Karma is in maintenance-only mode as
of 2023; AngularJS reached end-of-life Jan 2022; new Angular
projects use Jest or Vitest. Karma + Jasmine setups are explicitly
legacy.

## Step 8 - Migration to Jest path

Jest's API is mostly compatible with Jasmine - typical migration
steps:

1. Replace `spyOn().and.returnValue()` with `jest.spyOn().mockReturnValue()`
2. Replace `jasmine.createSpy()` with `jest.fn()`
3. Replace `jasmine.createSpyObj()` with manual `jest.fn()` per method
4. Replace `expect().toBeNan()` with `expect(Number.isNaN()).toBe(true)`
   (matcher renamed)
5. Add `jest.config.js` with appropriate `testMatch`
6. Drop Karma if used (Jest handles its own jsdom env)

For automated migration: `jest-codemods` package handles ~80% of
the syntax transformations.

## Step 9 - CI integration

```yaml
- run: npm ci
- run: npx jasmine --config=spec/support/jasmine.json --reporter=jasmine-spec-reporter
# Or with JUnit XML for CI dashboards:
- run: npx jasmine --reporter=jasmine-junit-xml-reporter
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Start new project with Jasmine + Karma in 2026 | Legacy stack; Karma in maintenance | Use Vitest / Jest for new (Step 7) |
| `spyOn` without `.and` configurator | Spy returns undefined; tests pass-by-accident | Always configure (Step 4) |
| Use `fdescribe` / `fit` (focus) accidentally | Suite runs only focused specs | Lint rule equivalent of `mocha/no-exclusive-tests` |
| Mix Jasmine assertions with Chai | Two assertion APIs in one suite; reader confusion | Pick one (Step 3 - Jasmine's are sufficient) |
| Skip migration codemods when moving to Jest | Manual rewrites slow + error-prone | `jest-codemods` (Step 8) |

## Limitations

- Karma maintenance-only; for browser-environment tests, prefer
  Vitest browser-mode.
- Snapshot testing not built-in (use `jasmine-snapshot` or migrate to Jest).
- ESM support workable but rough; new Jasmine versions improving.
- Mock-server / fetch-mock ecosystems weaker than Jest's; more
  manual setup.

## References

- [jas-start][jas-start] - getting started
- jasmine.github.io/api/edge - API reference
- jasmine.github.io/api/edge/matchers.html - matcher list
- karma-runner.github.io - Karma (legacy)
- github.com/skovhus/jest-codemods - Jasmine→Jest migration codemods
- `jest-tests`,
  `vitest-tests`,
  `mocha-tests`,
  `ava-tests` - sister tools
- `test-code-conventions` (qa-test-review) - test code hygiene
