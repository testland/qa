# Rust mocking - mockall (reference)

Companion reference for `rust-unit-tests`. A test double (per
[ISTQB Glossary][istqb-double]) replaces a real dependency so the subject
under test runs in isolation. mockall is the community-standard Rust
mocking crate; use it when a unit test reaches a database, HTTP client,
file system, or any trait boundary. For tests that do not cross a trait
boundary, prefer real objects or simple stubs.

[istqb-double]: https://glossary.istqb.org/en_US/term/test-double

Per [docs.rs/mockall/latest/mockall][mockall-docs]:

[mockall-docs]: https://docs.rs/mockall/latest/mockall/

```toml
[dev-dependencies]
mockall = "0.14.0"
```

Two entry points: `#[automock]` for traits you own; `mock!` for structs or
traits defined in external crates.

## #[automock] on a trait

Applying `#[automock]` generates a `MockTraitName` struct in the same
module:

```rust
use mockall::automock;
use mockall::predicate::*;

#[automock]
pub trait Cache {
    fn get(&self, key: &str) -> Option<String>;
    fn set(&mut self, key: &str, value: String);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_lookup_hits_cache() {
        let mut mock = MockCache::new();

        mock.expect_get()
            .with(eq("user:42"))
            .times(1)
            .returning(|_| Some("alice".to_string()));

        let result = lookup(&mock, "user:42");
        assert_eq!(result, Some("alice".to_string()));
    }
}
```

Expectations are verified automatically when the mock is dropped: a
declared `times(1)` with no call panics on drop and fails the test.

## mock! macro for external traits and structs

Use `mock!` when the trait lives in a dependency you cannot annotate:

```rust
use mockall::mock;

mock! {
    pub HttpClient {}
    impl reqwest_like::Client for HttpClient {
        fn get(&self, url: &str) -> String;
        fn post(&self, url: &str, body: &str) -> String;
    }
}

#[test]
fn test_fetch_uses_get() {
    let mut client = MockHttpClient::new();

    client.expect_get()
        .with(eq("https://api.example.com/v1/data"))
        .times(1)
        .return_once(|_| r#"{"ok":true}"#.to_string());

    let result = fetch_data(&client);
    assert!(result.contains("ok"));
}
```

## Expectation methods

| Method | Behaviour |
|---|---|
| `.times(n)` | Requires exactly n calls |
| `.times(..)` | Any number (range syntax) |
| `.with(matcher)` | Argument predicate from `mockall::predicate::*` |
| `.returning(closure)` | Computes return value via `FnMut` |
| `.return_once(closure)` | Consumes an `FnOnce` (for non-`Clone` returns) |
| `.return_const(value)` | Clones and returns a constant |
| `.never()` | Asserts the method is never called |

Common predicates (`mockall::predicate::*`): `eq(v)`, `ne(v)`, `lt(v)`,
`gt(v)`, `function(fn)`, `always()`, `never()`.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Mock every dependency | Tests verify mock wiring, not behavior | Mock only true isolation boundaries |
| Missing `#[cfg(test)]` on the mock module | Mock types compiled into the release binary | Wrap `MockXxx` usage in `#[cfg(test)]` |
| `mock!` when `#[automock]` suffices | Verbose boilerplate for owned traits | `#[automock]` for traits in your crate |

## Limitations

- `#[automock]` doesn't support some advanced generic trait patterns -
  fall back to `mock!` with explicit type parameters.
- Expectations verify on drop; with multiple mocks in scope, drop-order
  panics can produce confusing test output.

## References

- [mockall-docs][mockall-docs] - mockall crate documentation
- [istqb-double][istqb-double] - ISTQB test-double definition
- Go mocking (gomock, testify/mock) → `go-unit-tests`
  references/go-mocking.md
