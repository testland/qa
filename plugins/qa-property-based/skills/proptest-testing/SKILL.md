---
name: proptest-testing
description: Authors property-based tests in Rust using proptest — wires the `proptest!` macro, defines strategies (`prop::collection::vec`, `any::<T>()`, regex-based string strategies), uses the strategy-per-value model (vs QuickCheck's per-type) for flexible composition, and exploits proptest's automatic shrinking + persistence of failed cases (regression test artifact). Use when a Rust codebase needs PBT — pairs especially well with parsers, serializers, and any function with a structured input domain.
rating: 23
d6: 4
archetype: S1
---

# proptest-testing

## Overview

Per [proptest-readme][pt]:

[pt]: https://github.com/proptest-rs/proptest

> "**Proptest** is a property testing framework inspired by Python's
> Hypothesis. It automatically generates test inputs and shrinks
> failures to minimal cases."

> "**Strategy-based approach**: Unlike QuickCheck, generation is
> 'defined on a per-value basis instead of per-type,' enabling
> flexible composition." ([proptest-readme][pt])

The strategy-based design is the key differentiator from Rust's
`quickcheck` crate — proptest separates the generation strategy
from the type, so multiple strategies can produce the same type
without newtype wrappers.

> "Failure persistence: Failed test cases are saved for regression
> testing." ([proptest-readme][pt])

This means a failed property test produces a `proptest-regressions/`
file checked into git; future runs replay it before generating new
cases.

## When to use

- A Rust codebase has functions with structured inputs (parsers,
  serializers, validators, encoders).
- A bug fix needs property-level prevention (not just an example
  test).
- Round-trip / invariant properties hold
  (`decode(encode(x)) == x`, `sort(sort(x)) == sort(x)`).
- A refactor needs equivalence verification (new vs old produce
  same outputs for all inputs).

## Step 1 — Install

In `Cargo.toml`:

```toml
[dev-dependencies]
proptest = "1"
```

Note: per [proptest-readme][pt], "the crate mainly sees passive
maintenance" — the API is stable; new development is rare.

## Step 2 — Basic property

Per [proptest-readme][pt]:

```rust
use proptest::prelude::*;

proptest! {
    #[test]
    fn parses_valid_dates(s in "[0-9]{4}-[0-9]{2}-[0-9]{2}") {
        parse_date(&s).unwrap();
    }
}
```

The `proptest!` macro wraps a `#[test]`-style function. The
parameter declaration `s in "..."` says "generate `s` from the
regex strategy."

Per [proptest-readme][pt], one of proptest's distinguishing
features is **regex-based string generation**: `"[0-9]{4}-[0-9]{2}-[0-9]{2}"`
generates date-shaped strings without writing a custom strategy.

## Step 3 — Strategy catalog

| Strategy                             | Generates                              |
|--------------------------------------|----------------------------------------|
| `any::<T>()`                          | Any value of type `T` (uses default strategy) |
| `0..100i32`                           | Integers in range                       |
| `"[a-z]+"` (regex string)              | Strings matching regex                  |
| `prop::collection::vec(strategy, 0..10)` | Vec of length 0-10                  |
| `prop::collection::hash_map(k, v, 0..10)` | HashMap                          |
| `prop::collection::btree_set(s, 0..10)` | BTreeSet                              |
| `(s1, s2, s3)` (tuple)                 | Tuple of values                         |
| `Just(value)`                         | Constant                                |
| `prop_oneof![s1, s2, s3]`             | One of multiple strategies              |
| `s.prop_map(f)`                       | Transform via function                  |
| `s.prop_filter("reason", f)`          | Filter (with reason for shrinking)      |
| `s.prop_flat_map(f)`                  | Dependent generation                    |

## Step 4 — Custom strategies via `prop_compose!`

```rust
use proptest::prelude::*;

prop_compose! {
    fn valid_user()(
        id in 1u64..1_000_000u64,
        email in "[a-z]{3,10}@(example|test)\\.com",
        age in 18u32..100u32,
    ) -> User {
        User { id, email, age }
    }
}

proptest! {
    #[test]
    fn user_serialization_round_trip(u in valid_user()) {
        let json = serde_json::to_string(&u).unwrap();
        let back: User = serde_json::from_str(&json).unwrap();
        prop_assert_eq!(u, back);
    }
}
```

`prop_compose!` builds a strategy from multiple sub-strategies;
the body returns a constructed value. The `()` after the function
name is for non-generated parameters (rare).

## Step 5 — Configuration

```rust
proptest! {
    #![proptest_config(ProptestConfig {
        cases: 1000,                                  // default 256
        max_shrink_iters: 100,                       // default 1024
        ..ProptestConfig::default()
    })]

    #[test]
    fn expensive_property(x in any::<u64>()) {
        // ...
    }
}
```

Common config options:

| Field                  | Default | Use                                                  |
|------------------------|--------:|------------------------------------------------------|
| `cases`                |    256  | More for higher confidence; slower CI.               |
| `max_shrink_iters`     |   1024  | Cap shrinking time on slow tests.                    |
| `max_shrink_time`      |    0    | Time-based shrink cap (ms; 0 = unlimited).           |
| `verbose`              |    0    | 0 / 1 / 2 — verbosity level.                        |
| `failure_persistence`  |  enabled | Persist failed cases to `proptest-regressions/`.    |

## Step 6 — Failure persistence (the regression file)

When a property fails, proptest writes:

```
# proptest-regressions/my_module.txt
# Seeds for failure cases proptest has generated in the past.
# It is recommended to commit this file.
cc abc1234567890 # shrinks to s = "1900-02-30"
```

**Commit this file to git.** Future runs replay these seeds before
generating new cases — locks the regression in.

If the regression is no longer relevant (the bug was fixed via a
different code path that doesn't fail this case anymore), delete
the entry. Don't suppress failures; understand them first.

## Step 7 — Round-trip and invariant patterns

Per [proptest-readme][pt]: property testing checks "that certain
properties of your code hold for arbitrary inputs."

```rust
// Round-trip
proptest! {
    #[test]
    fn json_round_trip(v in any::<Value>()) {
        let json = serde_json::to_string(&v).unwrap();
        let parsed: Value = serde_json::from_str(&json).unwrap();
        prop_assert_eq!(v, parsed);
    }
}

// Invariant — sort produces sorted output
proptest! {
    #[test]
    fn sorted_is_sorted(mut v in prop::collection::vec(any::<i32>(), 0..1000)) {
        v.sort();
        for window in v.windows(2) {
            prop_assert!(window[0] <= window[1]);
        }
    }
}

// Equivalence — new impl matches old
proptest! {
    #[test]
    fn new_matches_old(input in any::<Input>()) {
        prop_assert_eq!(new_implementation(&input), old_implementation(&input));
    }
}
```

`prop_assert!` and `prop_assert_eq!` integrate with the shrinker
better than vanilla `assert!` — use them inside `proptest!` blocks.

## Step 8 — CI integration

```yaml
- run: cargo test --workspace
```

That's it — proptest tests are regular `#[test]` functions wrapped
in the macro. Cargo's `--test-threads` and parallel test execution
work normally.

For deterministic CI, set the seed via env var:

```yaml
env:
  PROPTEST_SEED: 0xDEADBEEF
- run: cargo test
```

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| `.gitignore proptest-regressions/`                                     | Loses regression artifacts; future runs may not catch the same bug.      | Commit the directory (Step 6). |
| Heavy `prop_filter` on broad strategies                                 | Slow generation; many cases discarded.                                  | Constrained strategies (Step 3, e.g. `1u32..100u32` instead of `any().filter`). |
| `assert!` instead of `prop_assert!` inside the macro                    | Shrinker can't see the failure context; minimal case obscured.          | Always `prop_assert!` / `prop_assert_eq!` (Step 7). |
| Bare `unwrap()` inside the property without context                     | Error message is unhelpful; shrinker can't aid debugging.                | Use `prop_assert!(result.is_ok())` or `let v = result.unwrap()` after asserting. |
| `cases = 100_000` for a slow test                                       | CI never finishes; team disables.                                       | Budget appropriate to test runtime. |
| Mocking external services inside the property                          | Mocks don't satisfy properties.                                         | Test pure functions; integration tests separate. |
| Random seed in CI                                                       | Failures hard to reproduce.                                              | `PROPTEST_SEED` env var (Step 8). |

## Limitations

- **Maintenance status.** Per [proptest-readme][pt], "the crate
  mainly sees passive maintenance." Expect bug fixes but not new
  features.
- **MSRV 1.84.** Older Rust toolchains can't use the latest version.
- **Shrinking on complex types is slow.** `max_shrink_iters` /
  `max_shrink_time` cap it.
- **Async testing requires manual integration.** No native
  `proptest!` for `async fn`; wrap with `tokio::test` and
  `block_on`.
- **No race-condition detection.** Unlike fast-check's `fc.scheduler`,
  proptest doesn't model concurrent interleavings out of the box.

## References

- [pt][pt] — proptest README: strategy-based approach,
  regex-string generation, failure persistence, comparison vs
  QuickCheck, MSRV, license.
- [`hypothesis-testing`](../hypothesis-testing/SKILL.md) — Python
  sibling proptest is inspired by.
- [`fast-check-testing`](../fast-check-testing/SKILL.md),
  [`jqwik-testing`](../jqwik-testing/SKILL.md),
  [`quickcheck-testing`](../quickcheck-testing/SKILL.md) —
  per-language siblings.
