# Mocha - pluggable JS test runner (maintenance reference)

Companion reference for `js-unit-tests`. Consult when maintaining a legacy
Mocha codebase, or when a library/tooling project prefers a minimal pluggable
runner over Jest/Vitest's batteries-included model. For new projects, prefer
Jest or Vitest (see the Choosing section of SKILL.md).

Per [mochajs.org][mocha]:

[mocha]: https://mochajs.org/

Mocha is the original mainstream JS test runner. Distinguishing features:

- **Pluggable**: assertions (Chai / Node assert), mocking (Sinon), coverage
  (nyc / c8) are separate libraries - pick what you need.
- **Two interfaces**: BDD (`describe`/`it`, default) and TDD (`suite`/`test`).
- **Reporter ecosystem**: spec, json, html, tap, dot, mocha-junit-reporter.
- **Parallel mode** (Mocha 8+): `--parallel` flag for multi-process runs.

## Install and first test

```bash
npm install --save-dev mocha
npm install --save-dev chai sinon nyc   # typical peers
```

```javascript
// test/sum.test.js
const { expect } = require('chai');
const { sum } = require('../src/sum');

describe('sum', () => {
  it('adds 1 + 2 to equal 3', () => {
    expect(sum(1, 2)).to.equal(3);
  });
});
```

Wire `"test": "mocha"` in package.json. Default test glob:
`./test/*.{js,cjs,mjs}` plus `./test/**/*.spec.js`. Node's built-in
`node:assert` works too when zero extra deps matter.

## `.mocharc.json` configuration

Config files: `.mocharc.json`, `.mocharc.js`, `.mocharc.yaml`, or a `mocha`
key in package.json:

```json
{
  "spec": ["test/**/*.spec.js"],
  "recursive": true,
  "require": ["ts-node/register", "./test/setup.js"],
  "reporter": "spec",
  "timeout": 5000,
  "parallel": true,
  "jobs": 4,
  "ui": "bdd",
  "extension": ["js", "ts"]
}
```

Key options: `parallel` + `jobs` (multi-process, Mocha 8+); `ui: 'bdd'`
(default) vs `'tdd'`; `recursive` (nested test dirs); `require` (preload
TS support / setup).

## Async patterns

Per [mocha][mocha], three approaches - callback (`done`), returned promise,
and async/await (preferred):

```javascript
it('async/await', async () => {
  const result = await doAsyncWork();
  expect(result).to.equal(42);
});
```

The async function MUST `return` (or `await`) - otherwise the promise's
rejection isn't surfaced to Mocha and tests pass-by-accident.

## Hooks, exclusivity, and skipping

`before` / `after` (once per describe block) and `beforeEach` / `afterEach`
(per test) all accept async bodies. `it.only` / `describe.only` run
exclusively; `it.skip` / `xit` skip. Forbid committed `.only` via
`eslint-plugin-mocha`'s `mocha/no-exclusive-tests` rule.

## Coverage with nyc / c8

```json
{
  "extends": "@istanbuljs/nyc-config-typescript",
  "all": true,
  "check-coverage": true,
  "branches": 80, "lines": 80, "functions": 80, "statements": 80,
  "include": ["src/**/*.{js,ts}"],
  "reporter": ["text", "lcov", "html"]
}
```

Run `nyc mocha` (Istanbul instrumentation), or `c8 mocha` (Node's built-in
V8 coverage; faster, no instrumentation). `check-coverage` + thresholds make
the run fail below the floor.

## Parallel mode and root hooks

Per [parallel mode][mocha-par] (Mocha 8+): `mocha --parallel --jobs 4`.
Tests must be independent - shared state across describe blocks breaks
parallel runs.

**Root hooks stop working in parallel mode.** "Each test file gets its own
instance of Mocha", so a root hook defined in file A "will not be present"
in file B ([mocha-par][mocha-par]). The serial-era pattern -
`--file ./test/setup.js` installing a top-level `before` - does not carry
over. Two supported replacements ([root hook plugins][mocha-rhp]):

```js
// test/hooks.js - loaded with `mocha --require test/hooks.js`
export const mochaHooks = {
  beforeEach() { /* runs in every worker, before every test */ },
};

// once per run, not per worker ([global fixtures][mocha-gf]):
export const mochaGlobalSetup = async () => { /* seed */ };
export const mochaGlobalTeardown = async () => { /* tear down */ };
```

[mocha-par]: https://mochajs.org/#parallel-mode
[mocha-rhp]: https://mochajs.org/#root-hook-plugins
[mocha-gf]: https://mochajs.org/#global-fixtures

## CI integration

```yaml
- run: npm ci
- run: npx mocha --reporter mocha-junit-reporter --reporter-option mochaFile=./test-results/junit.xml
# Or with coverage:
- run: npx c8 --reporter lcov mocha
- uses: codecov/codecov-action@v4
  with: { files: ./coverage/lcov.info }
```

`mocha-junit-reporter` emits JUnit XML for `junit-xml-analysis`
(qa-test-reporting).

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Forget `return` / `await` on async test body | Rejection silently passes the test | Always `return` or `await` |
| Commit `.only` accidentally | CI runs only one test | `mocha/no-exclusive-tests` lint rule |
| `--parallel` with a shared root `before` | Hooks run inconsistently per-process | Root hook plugins / global fixtures |
| Mix BDD + TDD interfaces | Reader confusion | Pick one in `.mocharc.json` `ui:` |
| Skip `check-coverage` in nyc | Coverage gates not enforced | Enable + set thresholds |

## Limitations

- No bundled assertions / mocking / coverage - more setup vs Jest/Vitest.
- Watch mode less polished than Vitest's; snapshots need third-party
  `mocha-chai-jest-snapshot`.
- ESM support workable but historically rough; pin a recent Mocha version.

## References

- [mocha][mocha] - official site; mochajs.org/api - API reference
- chaijs.com - Chai assertions; sinonjs.org - Sinon mocking
- istanbul.js.org / github.com/bcoe/c8 - coverage tools
- github.com/michaelleeallen/mocha-junit-reporter - JUnit XML reporter
