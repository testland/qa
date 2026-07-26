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

## How to use

1. Confirm the codebase is legacy Jasmine / Karma or wants zero external
   assertion libraries (see When to use); for new projects prefer
   `vitest-tests` or `jest-tests`.
2. Install and scaffold: `npm install --save-dev jasmine` then
   `npx jasmine init` (creates `spec/support/jasmine.json`).
3. Write specs under `spec/` with `describe` / `it` and built-in matchers;
   wire `"test": "jasmine"` in `package.json`.
4. Replace collaborators with built-in spies (`spyOn(...).and.returnValue(...)`,
   `jasmine.createSpy`); always configure the spy so it does not return
   `undefined` by accident.
5. Handle async with `async/await` or a returned Promise, and use hooks
   (`beforeEach` / `afterEach`) for setup and teardown.
6. Run `npm test`; for browser-environment runs (Karma) and moving off
   Jasmine, see [references/karma-and-migration.md](references/karma-and-migration.md).

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

## Step 7 - CI integration

```yaml
- run: npm ci
- run: npx jasmine --config=spec/support/jasmine.json --reporter=jasmine-spec-reporter
# Or with JUnit XML for CI dashboards:
- run: npx jasmine --reporter=jasmine-junit-xml-reporter
```

## Browser tests and migrating off Jasmine

Running specs in a real browser (Karma, the legacy Angular CLI default) and
moving a suite to Jest (`jest-codemods` handles ~80% of the syntax
transformations) are covered in
[references/karma-and-migration.md](references/karma-and-migration.md).

## Worked example

A legacy service `userService.save(user)` POSTs to an API; verify it calls
the API without hitting the network.

1. Scaffold once with `npx jasmine init`.
2. Spec `spec/userServiceSpec.js`:

```javascript
const { userService } = require('../src/userService');
const api = require('../src/api');

describe('userService.save', () => {
  it('posts the user to /users', () => {
    spyOn(api, 'post').and.returnValue(Promise.resolve({ id: 1 }));
    userService.save({ name: 'Alice' });
    expect(api.post).toHaveBeenCalledWith('/users', { name: 'Alice' });
  });
});
```

3. Run `npm test`. `spyOn` replaces `api.post`, so no real request fires; the
   spec passes when `save` forwards the user to `/users`.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Start new project with Jasmine + Karma in 2026 | Legacy stack; Karma in maintenance | Use Vitest / Jest for new (see [references/karma-and-migration.md](references/karma-and-migration.md)) |
| `spyOn` without `.and` configurator | Spy returns undefined; tests pass-by-accident | Always configure (Step 4) |
| Use `fdescribe` / `fit` (focus) accidentally | Suite runs only focused specs | Lint rule equivalent of `mocha/no-exclusive-tests` |
| Mix Jasmine assertions with Chai | Two assertion APIs in one suite; reader confusion | Pick one (Step 3 - Jasmine's are sufficient) |
| Skip migration codemods when moving to Jest | Manual rewrites slow + error-prone | `jest-codemods` (see [references/karma-and-migration.md](references/karma-and-migration.md)) |

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
