---
name: rstest-tests
description: "Configures and runs rstest - Rust parametrized + fixture-based testing crate; `#[rstest]` attribute + `#[case(...)]` for parametrize; `#[fixture]` for reusable test setup; matrix tests via multiple `#[case]` × N (cartesian product); async test support via `#[async_std::test]` / `#[tokio::test]` + `#[rstest]`; `#[future]` for async fixtures. Use when working with Rust and needing parametrize/fixture patterns beyond stdlib `#[test]`."
---

# rstest-tests

## Overview

Per [github.com/la10736/rstest][rs-gh]:

[rs-gh]: https://github.com/la10736/rstest

rstest is a Rust crate for parametrize + fixture testing - features
that Rust's stdlib `#[test]` lacks. Pairs with [`cargo-test`](../cargo-test/SKILL.md)
(rstest tests are still discovered by `cargo test`).

## When to use

- Same input pattern repeated across many tests (parametrize wins).
- Setup code shared across multiple tests (fixture wins over `mod
  tests` shared state).
- Async test patterns benefit from rstest's async-fixture support.
- Migration from pytest/JUnit5 patterns to Rust.

## Step 1 - Install

`Cargo.toml`:

```toml
[dev-dependencies]
rstest = "0.21"
```

## Step 2 - Parametrize with `#[case]`

```rust
use rstest::rstest;

#[rstest]
#[case(1, 2, 3)]
#[case(0, 0, 0)]
#[case(-1, 1, 0)]
#[case(100, 200, 300)]
fn add_cases(#[case] a: i32, #[case] b: i32, #[case] expected: i32) {
    assert_eq!(add(a, b), expected);
}
```

Each `#[case]` runs as a separate test - failures don't stop
subsequent cases. Test names become `add_cases::case_1`,
`add_cases::case_2`, etc.

## Step 3 - Named cases

```rust
#[rstest]
#[case::positive(1, 2, 3)]
#[case::zero(0, 0, 0)]
#[case::negative(-1, 1, 0)]
fn add_named(#[case] a: i32, #[case] b: i32, #[case] expected: i32) {
    assert_eq!(add(a, b), expected);
}
```

Test names: `add_named::positive`, `add_named::zero`, etc. - much
better for failure logs.

## Step 4 - Fixtures

```rust
use rstest::{fixture, rstest};

#[fixture]
fn db() -> Database {
    Database::new_test_instance()
}

#[fixture]
fn user(db: Database) -> User {
    db.create_user("alice")
}

#[rstest]
fn test_user_id(user: User) {
    assert_eq!(user.id, 1);
}

#[rstest]
fn test_user_email(user: User, db: Database) {
    assert_eq!(db.find_user(user.id).email, "alice@example.com");
}
```

Fixtures are functions with `#[fixture]`; tests with `#[rstest]`
auto-receive them via parameter name matching. Fixture chaining
works (a fixture can request other fixtures).

## Step 5 - Matrix tests (cartesian product)

```rust
#[rstest]
fn test_matrix(
    #[values("alice", "bob", "charlie")] name: &str,
    #[values(0, 18, 65)] age: u32,
) {
    let user = User::new(name, age);
    assert!(user.is_valid());
}
```

Runs 3 × 3 = 9 tests with all combinations. Equivalent to
nested `#[case]` for cartesian product.

## Step 6 - Combined `#[case]` + `#[values]`

```rust
#[rstest]
#[case::happy("alice")]
#[case::edge("a")]
fn test_with_values(
    #[case] base_name: &str,
    #[values(0, 1, 100)] count: u32,
) {
    // happy × 3 values = 3 tests
    // edge × 3 values = 3 tests
}
```

## Step 7 - Async tests

```rust
use rstest::rstest;

#[rstest]
#[case(1, 2, 3)]
#[case(0, 0, 0)]
#[tokio::test]
async fn async_add_cases(#[case] a: i32, #[case] b: i32, #[case] expected: i32) {
    let result = add_async(a, b).await;
    assert_eq!(result, expected);
}
```

For async fixtures, use `#[future]`:

```rust
use rstest::*;

#[fixture]
async fn db_async() -> Database {
    Database::connect_async().await.unwrap()
}

#[rstest]
#[tokio::test]
async fn test_async(#[future] db_async: Database) {
    let db = db_async.await;
    assert!(db.is_connected());
}
```

## Step 8 - Indirect fixtures (parameterize fixture instances)

```rust
#[fixture]
fn user(#[default("alice")] name: &str) -> User {
    User::new(name)
}

#[rstest]
#[case::alice("alice")]
#[case::bob("bob")]
fn test_user(#[case] expected_name: &str, #[with(expected_name)] user: User) {
    assert_eq!(user.name, expected_name);
}
```

`#[with(...)]` injects custom args into the fixture for that test.

## Step 9 - CI integration

Same as plain `cargo test`:

```yaml
- run: cargo test --all-targets
```

rstest tests are discovered + run by `cargo test` natively - no
separate runner.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Use rstest for single-case tests | Adds dependency for no benefit | Plain `#[test]` for single cases |
| Skip `#[case::name]` | Test names become `case_1`, `case_2`; debug-hostile | Always name cases (Step 3) |
| Heavy matrix (5 dims × 5 values = 3125 tests) | Combinatorial explosion | Strategic cases vs full matrix |
| Mix sync + async tests in same parametrize | Confusing | Separate `#[rstest]` blocks per sync/async |

## Limitations

- Adds a dev dependency for what's syntactic sugar over `#[test]`.
- Test name generation can be opaque without explicit case names.
- Some IDE integrations don't show parametrized test cases as
  separate items.
- Async fixture support is solid but newer; pin recent rstest
  version.

## References

- [rs-gh][rs-gh] - rstest repository + docs
- crates.io/crates/rstest - published crate
- docs.rs/rstest - API reference
- [`go-test`](../go-test/SKILL.md),
  [`ginkgo-tests`](../ginkgo-tests/SKILL.md),
  [`cargo-test`](../cargo-test/SKILL.md) - sister tools
- [`proptest-testing`](../../../qa-property-based/skills/proptest-testing/SKILL.md) - Rust property-based
- [`test-code-conventions`](../../../qa-test-review/skills/test-code-conventions/SKILL.md)
