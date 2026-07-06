---
name: go-rust-mocking
description: "Isolates dependencies in Go and Rust unit tests using test-double generation - Go: `go.uber.org/mock` (gomock + mockgen codegen) and `github.com/stretchr/testify/mock` (hand-written stubs); Rust: `mockall` crate with `#[automock]` for traits and `mock!` macro for structs and external traits. Use when a unit test reaches a database, HTTP client, file system, or any interface boundary that must be replaced with a controlled fake to keep tests fast, deterministic, and isolated."
---

# go-rust-mocking

## Overview

A test double (per [ISTQB Glossary v4.7.1][istqb-double]) is a component
that replaces a real dependency during testing so the subject under test
can be exercised in isolation. This skill covers the two dominant
double-generation approaches in the Go and Rust ecosystems.

[istqb-double]: https://glossary.istqb.org/en_US/term/test-double-2

| Ecosystem | Tool | Approach |
|---|---|---|
| Go | `go.uber.org/mock` (gomock + mockgen) | Codegen from interface |
| Go | `github.com/stretchr/testify/mock` | Hand-written stub struct |
| Rust | `mockall` | Attribute (`#[automock]`) or macro (`mock!`) |

## When to use

- The code under test calls an interface or trait you do not own (database,
  HTTP client, queue, file system, external SDK).
- You need to assert that a dependency was called with specific arguments,
  called exactly N times, or never called.
- The real dependency is slow, non-deterministic, or unavailable in CI.

For tests that do not cross an interface boundary, prefer real objects or
simple stubs without a mocking library.

## Go: gomock (go.uber.org/mock)

### Install

Per [github.com/uber-go/mock][uber-mock-readme]:

[uber-mock-readme]: https://github.com/uber-go/mock

```bash
go get go.uber.org/mock/gomock
go install go.uber.org/mock/mockgen@latest
```

`mockgen` is the code generator. `go.uber.org/mock/gomock` is the runtime
package imported in tests.

### Generate a mock

Two modes. Source mode reads a `.go` file; package mode reflects the
installed package. Per [pkg.go.dev/go.uber.org/mock/gomock][uber-mock-pkg]:

[uber-mock-pkg]: https://pkg.go.dev/go.uber.org/mock/gomock

```bash
# Source mode: generates from a .go file
mockgen -source=internal/store/store.go \
        -destination=internal/store/mock_store.go \
        -package=store

# Package mode: specifies package + interface names
mockgen github.com/myorg/myapp/internal/store Store,Querier \
        > internal/store/mock_store.go
```

Commit generated files or regenerate in CI via `go generate`. Add a
`//go:generate mockgen ...` directive in the source file so `go generate ./...`
keeps mocks in sync.

The `-typed` flag (default false) emits type-safe `Return`/`Do`/`DoAndReturn`
helpers that avoid `any` casts in expectations.

### Write a test with gomock

Per [pkg.go.dev/go.uber.org/mock/gomock][uber-mock-pkg]:

```go
func TestOrderService_Submit(t *testing.T) {
    ctrl := gomock.NewController(t)
    // ctrl.Finish() is called automatically via t.Cleanup when *testing.T
    // is passed to NewController - no explicit call needed.

    mockStore := store.NewMockStore(ctrl)

    // Expect SaveOrder called once with any Order, return nil error.
    mockStore.EXPECT().
        SaveOrder(gomock.Any()).
        Return(nil).
        Times(1)

    svc := NewOrderService(mockStore)
    if err := svc.Submit(Order{ID: "abc"}); err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
}
```

### Key matchers

Per [pkg.go.dev/go.uber.org/mock/gomock][uber-mock-pkg]:

| Matcher | Behaviour |
|---|---|
| `gomock.Any()` | Accepts any argument value |
| `gomock.Eq(v)` | Deep equality |
| `gomock.Nil()` | Matches nil |
| `gomock.Not(m)` | Negates matcher `m` |
| `gomock.AssignableToTypeOf(v)` | Type-assignability check |
| `gomock.InAnyOrder(s)` | Slice elements in any order |
| `gomock.Regex(re)` | String matches regexp |

### Call-count and ordering

Per [pkg.go.dev/go.uber.org/mock/gomock][uber-mock-pkg]:

```go
// Exact count
mockStore.EXPECT().FindByID(gomock.Any()).Return(nil, ErrNotFound).Times(2)

// At least / at most
mockStore.EXPECT().Ping().MinTimes(1).MaxTimes(3)

// Unbounded
mockStore.EXPECT().Metrics().AnyTimes()

// Strict ordering
gomock.InOrder(
    mockStore.EXPECT().Begin(),
    mockStore.EXPECT().SaveOrder(gomock.Any()).Return(nil),
    mockStore.EXPECT().Commit(),
)
```

## Go: testify/mock (github.com/stretchr/testify)

Per [github.com/stretchr/testify][testify-readme] and
[pkg.go.dev/github.com/stretchr/testify/mock][testify-mock-pkg]:

[testify-readme]: https://github.com/stretchr/testify
[testify-mock-pkg]: https://pkg.go.dev/github.com/stretchr/testify/mock

```bash
go get github.com/stretchr/testify
```

Import path for the mock sub-package: `github.com/stretchr/testify/mock`.

### Define a mock struct

Embed `mock.Mock` and implement the interface by hand. Each method calls
`m.Called(...)` to record the invocation and retrieve configured returns:

```go
// Implements the Notifier interface.
type MockNotifier struct {
    mock.Mock
}

func (m *MockNotifier) Send(to, body string) error {
    args := m.Called(to, body)
    return args.Error(0)
}
```

### Write a test with testify/mock

Per [github.com/stretchr/testify][testify-readme]:

```go
func TestAlertService_Notify(t *testing.T) {
    n := new(MockNotifier)

    // On("MethodName", arg...).Return(values...)
    n.On("Send", "ops@example.com", mock.Anything).Return(nil)

    svc := NewAlertService(n)
    if err := svc.Notify("ops@example.com", "disk full"); err != nil {
        t.Fatalf("unexpected error: %v", err)
    }

    // Asserts every On(...) expectation was exercised.
    n.AssertExpectations(t)
}
```

`mock.Anything` matches any value for that argument position (equivalent
to `gomock.Any()`).

Additional assertion methods per [pkg.go.dev/github.com/stretchr/testify/mock][testify-mock-pkg]:

- `n.AssertCalled(t, "Send", "ops@example.com", mock.Anything)` - verifies
  the call happened.
- `n.AssertNotCalled(t, "Send")` - verifies it never happened.

### Choosing between gomock and testify/mock

| Concern | gomock | testify/mock |
|---|---|---|
| Mock generation | `mockgen` codegen | Hand-written |
| Argument matching | Rich matcher library | `mock.Anything` + basic |
| Strict call count | `Times`/`MinTimes`/`MaxTimes` | `Times(n)` on `Call` |
| Ordering | `InOrder`/`After` | Not built-in |
| Dependency | Two packages (gomock + mockgen) | One package |

Use gomock when strict call-order or exhaustive argument matching matters.
Use testify/mock when the team already uses `testify/assert` and wants a
single dependency.

## Rust: mockall

Per [docs.rs/mockall/latest/mockall][mockall-docs]:

[mockall-docs]: https://docs.rs/mockall/latest/mockall/

```toml
# Cargo.toml
[dev-dependencies]
mockall = "0.14.0"
```

Two entry points: `#[automock]` for traits you own; `mock!` for structs or
traits defined in external crates.

### #[automock] on a trait

Per [docs.rs/mockall/latest/mockall][mockall-docs], applying `#[automock]`
generates a `MockTraitName` struct in the same module:

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

Expectations are verified automatically when `mock` is dropped: if
`times(1)` is declared but the method is never called, the drop panics
and fails the test.

### mock! macro for external traits and structs

Per [docs.rs/mockall/latest/mockall][mockall-docs], use `mock!` when the
trait is defined in a dependency you cannot annotate:

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

### Expectation methods

Per [docs.rs/mockall/latest/mockall][mockall-docs]:

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
| Mock every dependency | Tests verify mock wiring, not behavior | Mock only across true isolation boundaries |
| Forget `AssertExpectations` (testify) | Uncalled `On(...)` expectations pass silently | Always call `n.AssertExpectations(t)` at end |
| Check `ctrl.Finish()` manually (gomock) | Redundant; `NewController(t)` registers auto-cleanup | Remove manual `Finish()` calls |
| `AnyTimes()` on every call (gomock) | Hides missing invocations | Use `Times(1)` or `MinTimes(1)` by default |
| Forget `#[cfg(test)]` on mock module (Rust) | Mock types compiled into release binary | Wrap `MockXxx` usage in `#[cfg(test)]` |
| `mock!` when `#[automock]` is enough (Rust) | Verbose boilerplate for owned traits | Use `#[automock]` for traits in your own crate |

## Limitations

- **gomock**: generated mocks become stale when the interface changes; run
  `go generate ./...` in CI to catch drift.
- **testify/mock**: no codegen; hand-written stubs must be updated manually
  when the interface changes.
- **mockall `#[automock]`**: does not support some advanced generic trait
  patterns; fall back to `mock!` with explicit type parameters.
- **mockall**: expectations are verified on drop, which means panics in
  drop order can surface as confusing test output when multiple mocks are
  in scope.

## References

- [uber-mock-readme][uber-mock-readme] - `go.uber.org/mock` README
- [uber-mock-pkg][uber-mock-pkg] - `gomock` package documentation
- [testify-readme][testify-readme] - `stretchr/testify` README
- [testify-mock-pkg][testify-mock-pkg] - `testify/mock` package documentation
- [mockall-docs][mockall-docs] - `mockall` crate documentation on docs.rs
- [istqb-double][istqb-double] - ISTQB definition of test double
- [`go-test`](../go-test/SKILL.md) - Go stdlib testing (prerequisite)
- [`cargo-test`](../cargo-test/SKILL.md) - Rust cargo testing (prerequisite)
- [`rstest-tests`](../rstest-tests/SKILL.md) - Rust parametrized tests
