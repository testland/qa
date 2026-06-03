---
name: fast-check-testing
description: "Authors property-based tests in JavaScript / TypeScript using fast-check - wires `fc.assert(fc.property(arbitrary, ...))`, picks arbitraries (`fc.integer`, `fc.string`, `fc.array`, `fc.tuple`, `fc.record`), uses `.map()` / `.chain()` / `.filter()` to build domain arbitraries, and integrates with Jest / Vitest / Mocha / Jasmine / AVA / Tape. Use when a JS/TS codebase needs PBT to catch edge cases - fast-check has been used to find bugs in major libraries (`query-string`, etc.) and is trusted by Jest, Jasmine, fp-ts, Ramda."
rating: 24
d6: 4
---

# fast-check-testing

## Overview

fast-check is "a property-based testing framework for JavaScript
and TypeScript, inspired by QuickCheck"
([fast-check-readme][fcr]). Per ISTQB,
**property-based testing** is "a test approach in which test
results are verified using specified relations between inputs and
expected results of a test case."

[fcr]: https://github.com/dubzzz/fast-check

> "Trusted by major projects including Jest, Jasmine, fp-ts, and
> Ramda, and has uncovered bugs in popular libraries like
> query-string." ([fast-check-readme][fcr])

It's runner-agnostic ([fast-check-overview][fco]): "Test Runner
Agnostic: Works seamlessly with Jest, Mocha, Vitest, and other
testing frameworks without special integration."

[fco]: https://fast-check.dev/

## When to use

- A JS/TS codebase has functions with non-trivial input shapes
  (parsers, serializers, validators, data transforms).
- Async code where race conditions hide; fast-check supports race
  condition detection ([fast-check-overview][fco]).
- Round-trip / metamorphic properties hold (`encode(decode(x)) === x`).
- Existing example-based tests pass but production bugs keep
  appearing in edge cases not covered.

## Step 1 - Install

Per [fast-check-readme][fcr]:

```bash
npm install fast-check --save-dev
# or
yarn add fast-check --dev
# or
pnpm add -D fast-check
```

## Step 2 - Basic property

Per [fast-check-readme][fcr], the canonical Mocha-style example:

```typescript
import fc from 'fast-check';

const contains = (text, pattern) => text.indexOf(pattern) >= 0;

describe('properties', () => {
  it('should always contain itself', () => {
    fc.assert(fc.property(fc.string(), (text) => contains(text, text)));
  });

  it('should always contain its substrings', () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), fc.string(), (a, b, c) => {
        return contains(a + b + c, b);
      })
    );
  });
});
```

The shape: `fc.assert(fc.property(<arbitraries...>, (...inputs) => <predicate>))`.

The predicate returns:
- `true` → the property holds.
- `false` → the property fails.
- Throws an exception → the property fails (typical for
  `expect(...)` style assertions).

`fc.assert` runs the property with 100 generated cases by default;
on failure, fast-check shrinks to the minimal counterexample.

## Step 3 - Arbitraries catalog

Per [fast-check-overview][fco]:

| Arbitrary             | Generates                                |
|-----------------------|------------------------------------------|
| `fc.string()`          | Strings                                  |
| `fc.integer()`         | Integers                                 |
| `fc.float()` / `fc.double()` | Floats                            |
| `fc.boolean()`         | Booleans                                  |
| `fc.array(item)`       | Arrays of `item`                         |
| `fc.tuple(a, b, ...)` | Fixed-length tuples                       |
| `fc.record({ key: ... })` | Objects with specified properties     |
| `fc.option(item)`      | `item` or `null`                         |
| `fc.constantFrom(...)` | One of fixed values                      |
| `fc.oneof(a, b, ...)` | One of multiple arbitraries               |
| `fc.uuid()` / `fc.ipV4()` / `fc.emailAddress()` / `fc.webUrl()` | Format-specific |
| `fc.date()`            | Dates                                    |
| `fc.uniqueArray(item)` | Arrays without duplicates                |
| `fc.dictionary(key, value)` | Map / Record types                  |

## Step 4 - Combinators (.map / .chain / .filter)

Per [fast-check-overview][fco]: "Extensible via `map()` and
`chain()` combinators."

```typescript
// .map: transform a generated value
const evenInteger = fc.integer().map(n => n * 2);

// .chain: dependent generation (later value depends on earlier)
const stringWithKnownLength = fc.integer({ min: 1, max: 100 })
  .chain(len => fc.string({ minLength: len, maxLength: len }));

// .filter: reject (use sparingly — slow when filter rejects most)
const positiveInteger = fc.integer().filter(n => n > 0);
// Better:
const positiveInteger = fc.integer({ min: 1 });
```

`.filter()` discards rejections; `.map()` transforms. Prefer
`.map()` and constrained arbitraries over `.filter()` when
possible.

## Step 5 - Composite arbitraries via `fc.record`

```typescript
const user = fc.record({
  id: fc.uuid(),
  email: fc.emailAddress(),
  age: fc.integer({ min: 18, max: 100 }),
  tags: fc.uniqueArray(fc.constantFrom('admin', 'beta', 'churn-risk')),
  createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
});

it('serializes user to JSON and back', () => {
  fc.assert(
    fc.property(user, (u) => {
      expect(JSON.parse(JSON.stringify(u))).toEqual({
        ...u,
        createdAt: u.createdAt.toISOString(),
      });
    })
  );
});
```

`fc.record` produces objects with the specified shape; each field
is sampled per its arbitrary.

## Step 6 - Integrate with the test runner

Per [fast-check-overview][fco]: works "with major testing
frameworks including Jest, Vitest, Mocha, Jasmine, AVA, and Tape"
without special integration.

```typescript
// Jest / Vitest example
import { test, expect } from 'vitest';
import fc from 'fast-check';

test('reverse is involutive', () => {
  fc.assert(
    fc.property(fc.array(fc.integer()), (arr) => {
      expect([...arr].reverse().reverse()).toEqual(arr);
    })
  );
});
```

The assertion library (`expect`, `assert`) is the runner's; fast-check
hooks into thrown errors as failures.

## Step 7 - Race condition detection

Per [fast-check-overview][fco]: "Race condition detection for async
code."

```typescript
import { test } from 'vitest';
import fc from 'fast-check';

test('concurrent counter increments are atomic', async () => {
  await fc.assert(
    fc.asyncProperty(fc.scheduler(), async (s) => {
      const counter = new AsyncCounter();
      const tasks = [
        s.schedule(counter.increment()),
        s.schedule(counter.increment()),
        s.schedule(counter.increment()),
      ];
      await s.waitAll();
      await Promise.all(tasks);
      expect(counter.value).toBe(3);
    })
  );
});
```

`fc.scheduler` exhaustively explores task interleavings; `s.schedule`
queues an async operation; `s.waitAll()` advances. fast-check finds
interleavings that cause the property to fail - the canonical
race-condition catcher.

## Step 8 - Shrinking and reproducibility

When a property fails, fast-check prints the falsifying input + a
shrunk minimal version + a seed:

```
Property failed after 47 tests
{ seed: 1234567890, path: "12:1:0", endOnFailure: true }
Counterexample: [{"id": "abc", "age": -1}]
Shrunk 8 time(s)
Got error: Expected age to be >= 18, got -1
```

To reproduce, replay with the seed:

```typescript
fc.assert(
  fc.property(...),
  { seed: 1234567890, path: "12:1:0", endOnFailure: true }
);
```

The seed/path is the deterministic recipe to re-derive the failure.

For CI, set a fixed seed:

```typescript
import fc from 'fast-check';
fc.configureGlobal({ seed: process.env.CI ? 42 : Date.now() });
```

## Step 9 - Model-based testing

Per [fast-check-overview][fco]: "Model-based testing for stateful
systems."

```typescript
class CounterModel {
  count = 0;
  increment() { this.count++; }
  decrement() { this.count--; }
}

const allCommands = [
  fc.constant({ run: (c, real) => { c.increment(); real.increment(); expect(real.value).toBe(c.count); } }),
  fc.constant({ run: (c, real) => { c.decrement(); real.decrement(); expect(real.value).toBe(c.count); } }),
];

it('counter behaves per model', () => {
  fc.assert(
    fc.property(fc.commands(allCommands), (cmds) => {
      const model = new CounterModel();
      const real = new RealCounter();
      fc.modelRun(() => ({ model, real }), cmds);
    })
  );
});
```

fast-check generates random sequences of commands; the model
stays in sync with the real implementation; any divergence is a
bug in the real implementation.

## Anti-patterns

| Anti-pattern                                                            | Why it fails                                                              | Fix |
|-------------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Random CI seed                                                           | Property fails on CI, passes locally; hard to reproduce.                 | Fixed seed in CI (Step 8). |
| Heavy `.filter()` on broad arbitraries                                   | Generation slow; many cases discarded.                                   | Constrained arbitraries (Step 4). |
| Asserting on specific values inside the property                         | Defeats PBT; that's an example test.                                     | Properties assert relationships; examples go elsewhere. |
| Mocking dependencies inside the property                                 | Mocks don't satisfy properties.                                          | Test pure functions; integration tests for the rest. |
| `fc.assert(fc.property(...))` without `await` for async props            | Test passes incorrectly (Promise rejected silently).                     | `await fc.assert(fc.asyncProperty(...))`. |
| Generating an `fc.string()` for an email field                            | Wastes generation budget; mostly invalid.                                | `fc.emailAddress()` (Step 3). |
| One mega-property that asserts 5 things                                   | When it fails, hard to know which thing.                                  | One property per logical assertion. |

## Limitations

- **Shrinking time.** Complex arbitraries (deeply nested records)
  can take 30+ seconds to shrink. Use `endOnFailure: true` to
  short-circuit when the unshrunk case is sufficient.
- **Type inference for composite records.** TypeScript's inference
  on `fc.record({ ... })` can produce unhelpful types; explicit
  type annotations help.
- **Race-condition detection has cost.** `fc.scheduler` explores
  interleavings exhaustively; for many-task tests, runtime grows
  fast.
- **No formal proof.** 100 cases is convention; non-trivial domains
  may need more.

## References

- [fast-check-readme][fcr] - install, basic example with
  `fc.assert` / `fc.property` / `fc.string`, runner integration,
  trust list.
- [fast-check-overview][fco] - arbitraries catalog, `.map` /
  `.chain` combinators, race-condition detection, model-based
  testing, framework-agnostic positioning.
- [`hypothesis-testing`](../hypothesis-testing/SKILL.md) - Python
  sibling.
- [`schemathesis-fuzzing`](../../qa-api-testing/skills/schemathesis-fuzzing/SKILL.md) - applies fast-check-shaped PBT to API schemas.
