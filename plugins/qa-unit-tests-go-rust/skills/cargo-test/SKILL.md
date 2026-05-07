---
name: cargo-test
description: "Configures and runs Rust's built-in `cargo test` — `#[test]` + `#[should_panic]` + `Result<(), E>` returns; integration tests in `tests/`; doc-tests embedded in `///` comments; `--lib` / `--bins` / `--all-targets` / `--workspace` selection; `cargo bench` (nightly) + Criterion (stable); `cargo test -- --test-threads=1` for serial; `cargo test -- --nocapture` to see println output. Use for any Rust project — testing is built into Cargo, no install needed."
rating: 24
d6: 4
archetype: S1
---

# cargo-test

## Overview

Per [doc.rust-lang.org/book/ch11-00-testing.html][rust-test]:

[rust-test]: https://doc.rust-lang.org/book/ch11-00-testing.html

Rust's testing is built into Cargo. The `#[test]` attribute marks
test functions; `cargo test` discovers and runs them.

Three test categories per the [`Rust Book`][rust-test]:

| Category | Location | Purpose |
|---|---|---|
| Unit tests | Same file as code, in `#[cfg(test)] mod tests { ... }` | Test private + internal logic |
| Integration tests | `tests/` directory at crate root | Test public API as external user |
| Doc tests | Inside `///` doc comments | Verify documentation examples |

## Step 1 — Unit tests

```rust
// src/math.rs
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn adds_two_numbers() {
        assert_eq!(add(1, 2), 3);
    }

    #[test]
    fn handles_zero() {
        assert_eq!(add(0, 0), 0);
    }
}
```

Run:

```bash
cargo test                 # all tests
cargo test add             # filter by name pattern
cargo test --lib           # only unit tests in lib
cargo test --bins          # binary tests
cargo test --all-targets   # everything
cargo test --workspace     # multi-crate workspace
```

## Step 2 — Assertion macros

```rust
assert!(condition);
assert!(condition, "format message: {}", value);
assert_eq!(actual, expected);
assert_eq!(actual, expected, "with message");
assert_ne!(actual, unexpected);

// Custom error message:
assert!(actual > 0, "Expected positive, got {}", actual);
```

For richer assertions, the `pretty_assertions` crate provides
diff-rich macros:

```rust
use pretty_assertions::assert_eq;
assert_eq!(actual_complex_struct, expected_complex_struct);
// shows colorized diff on failure
```

## Step 3 — `#[should_panic]`

```rust
#[test]
#[should_panic]
fn panics_on_negative() {
    sqrt(-1.0);
}

#[test]
#[should_panic(expected = "negative")]
fn specific_panic_message() {
    sqrt(-1.0);
    // panics with message containing "negative"
}
```

## Step 4 — `Result` return for ?-style propagation

```rust
#[test]
fn parses_config() -> Result<(), Box<dyn Error>> {
    let cfg = Config::from_file("test/fixtures/config.toml")?;
    assert_eq!(cfg.port, 8080);
    Ok(())
}
```

Test passes if `Ok(())`; fails if `Err(...)`. Avoids `unwrap()`
boilerplate; allows `?` operator in test bodies.

## Step 5 — Integration tests

```
my-crate/
  src/
    lib.rs
  tests/
    integration_test.rs    # automatically discovered
    common/
      mod.rs               # shared helpers (note: NO mod.rs in tests/ root)
```

```rust
// tests/integration_test.rs
use my_crate::Calculator;

#[test]
fn end_to_end() {
    let c = Calculator::new();
    assert_eq!(c.add(1, 2), 3);
}

mod common;   // shared test helpers from tests/common/mod.rs
```

Each file in `tests/` compiles to its own binary — slower but
better-isolated than unit tests.

## Step 6 — Doc tests

```rust
/// Adds two numbers.
///
/// # Examples
///
/// ```
/// use my_crate::math::add;
/// assert_eq!(add(1, 2), 3);
/// ```
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}
```

`cargo test --doc` runs only doc tests; `cargo test` runs everything
including docs. The example IS the test — drift between docs +
implementation is caught.

`# Examples` heading is convention; required for `cargo doc` HTML
rendering to show the example.

## Step 7 — Common test runner flags

```bash
cargo test -- --test-threads=1           # serial (single-threaded)
cargo test -- --nocapture                 # show stdout (println in tests)
cargo test -- --show-output               # show stdout for passed tests too
cargo test -- --ignored                   # only run #[ignore]-marked tests
cargo test -- --include-ignored           # run both ignored + normal
cargo test -- --list                      # list tests without running
cargo test some_pattern -- --exact        # exact match (no substring)
```

## Step 8 — `#[ignore]` for slow tests

```rust
#[test]
#[ignore = "Requires network access"]
fn integration_with_external_api() {
    // ...
}
```

Run via `cargo test -- --include-ignored`.

## Step 9 — Coverage

Stable Rust support via `cargo-tarpaulin` (Linux) or `cargo-llvm-cov`
(cross-platform):

```bash
# llvm-cov (recommended for cross-platform)
cargo install cargo-llvm-cov
cargo llvm-cov --html              # HTML report
cargo llvm-cov --lcov --output-path coverage.lcov
cargo llvm-cov --fail-under-lines 80   # gate at 80%

# Or tarpaulin (Linux-only)
cargo install cargo-tarpaulin
cargo tarpaulin --out html --output-dir coverage/
```

## Step 10 — Benchmarks

Stable: use Criterion (mature, ergonomic):

```bash
cargo install cargo-criterion
```

```toml
# Cargo.toml
[dev-dependencies]
criterion = "0.5"

[[bench]]
name = "math_bench"
harness = false
```

```rust
// benches/math_bench.rs
use criterion::{black_box, criterion_group, criterion_main, Criterion};
use my_crate::math::add;

fn bench_add(c: &mut Criterion) {
    c.bench_function("add 1 2", |b| b.iter(|| add(black_box(1), black_box(2))));
}

criterion_group!(benches, bench_add);
criterion_main!(benches);
```

```bash
cargo bench
# Or via criterion CLI for richer reports:
cargo criterion
```

Nightly Rust has built-in `#[bench]` (`cargo +nightly bench`); not
recommended for CI (requires nightly toolchain).

## Step 11 — CI integration

```yaml
- run: cargo test --all-targets --workspace
- run: cargo test --doc                # explicit doc tests
- run: cargo install cargo-llvm-cov
- run: cargo llvm-cov --lcov --output-path coverage.lcov
- uses: codecov/codecov-action@v4
  with: { files: coverage.lcov }
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Skip `--all-targets` | Doc tests + bench + examples not run | Always `--all-targets` (Step 1) |
| Use `unwrap()` in test bodies | Test failure message is "called unwrap on None"; useless | Use `Result<(), E>` return + `?` (Step 4) |
| `#[ignore]` without reason | Forgotten ignored tests | Always include `= "reason"` (Step 8) |
| `assert!(x == y)` instead of `assert_eq!` | Loses diff in failure | Use `assert_eq!` (Step 2) |
| Skip Criterion for performance work | Stdlib `#[bench]` is nightly-only; CI breaks | Use Criterion on stable (Step 10) |

## Limitations

- No fixture concept beyond `mod tests` shared state.
- Doc tests slow to compile (each runs as separate doctest binary).
- No mocking library in stdlib — `mockall` is the community standard
  for trait mocking.
- No parametrize beyond hand-rolled loops or `rstest` (see
  [`rstest-tests`](../rstest-tests/SKILL.md)).

## References

- [rust-test][rust-test] — Rust Book Chapter 11 (testing)
- doc.rust-lang.org/cargo/commands/cargo-test.html — `cargo test` reference
- bheisler.github.io/criterion.rs — Criterion docs
- crates.io/crates/cargo-llvm-cov — coverage tool
- [`go-test`](../go-test/SKILL.md),
  [`ginkgo-tests`](../ginkgo-tests/SKILL.md),
  [`rstest-tests`](../rstest-tests/SKILL.md) — sister tools
- [`proptest-testing`](../../qa-property-based/skills/proptest-testing/SKILL.md) — Rust property-based
- [`test-code-conventions`](../../qa-test-review/skills/test-code-conventions/SKILL.md)
