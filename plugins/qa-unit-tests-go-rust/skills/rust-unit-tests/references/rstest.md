# rstest - Rust parametrize + fixtures (reference)

Companion reference for `rust-unit-tests`. rstest adds parametrize and
fixture patterns that stdlib `#[test]` lacks; its tests are still
discovered and run by `cargo test` - no separate runner. Use when the same
input pattern repeats across many tests, setup is shared across 3+ tests,
or migrating pytest/JUnit5 habits to Rust. For single-case tests, plain
`#[test]` needs no extra dependency.

Per [github.com/la10736/rstest][rs-gh]:

[rs-gh]: https://github.com/la10736/rstest

## Install

```toml
[dev-dependencies]
rstest = "0.21"
```

## Parametrize with `#[case]`

```rust
use rstest::rstest;

#[rstest]
#[case(1, 2, 3)]
#[case(0, 0, 0)]
#[case(-1, 1, 0)]
fn add_cases(#[case] a: i32, #[case] b: i32, #[case] expected: i32) {
    assert_eq!(add(a, b), expected);
}
```

Each `#[case]` runs as a separate test; failures don't stop subsequent
cases. Name the cases - `#[case::positive(1, 2, 3)]` yields
`add_cases::positive` instead of the debug-hostile `case_1`.

## Fixtures

```rust
use rstest::{fixture, rstest};

#[fixture]
fn db() -> Database {
    Database::new_test_instance()
}

#[fixture]
fn user(db: Database) -> User {          // fixtures can chain
    db.create_user("alice")
}

#[rstest]
fn test_user_id(user: User) {            // injected by parameter name
    assert_eq!(user.id, 1);
}
```

Customize a fixture per test with `#[default(...)]` on the fixture
parameter and `#[with(...)]` at the call site:

```rust
#[fixture]
fn user(#[default("alice")] name: &str) -> User { User::new(name) }

#[rstest]
#[case::bob("bob")]
fn test_user(#[case] expected: &str, #[with(expected)] user: User) {
    assert_eq!(user.name, expected);
}
```

## Matrix tests (cartesian product)

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

Runs 3 × 3 = 9 combinations. `#[case]` and `#[values]` combine (each case
× each value). Watch the explosion - 5 dims × 5 values = 3125 tests;
prefer strategic cases over a full matrix.

## Async tests

```rust
#[rstest]
#[case(1, 2, 3)]
#[tokio::test]
async fn async_add_cases(#[case] a: i32, #[case] b: i32, #[case] expected: i32) {
    assert_eq!(add_async(a, b).await, expected);
}
```

Async fixtures use `#[future]`:

```rust
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

## CI

Same as plain cargo: `cargo test --all-targets` - rstest tests are
native `cargo test` citizens.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| rstest for single-case tests | Dependency for no benefit | Plain `#[test]` |
| Unnamed cases | `case_1`, `case_2` in failure logs | `#[case::name(...)]` |
| Full matrix everywhere | Combinatorial explosion | Strategic cases |
| Mixing sync + async in one parametrize | Confusing | Separate `#[rstest]` blocks |

## References

- [rs-gh][rs-gh] - rstest repository + docs
- crates.io/crates/rstest / docs.rs/rstest - published crate + API
