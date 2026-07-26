# Coverage and benchmarks

Measurement tooling for `cargo test`. Both need an extra crate installed;
neither ships in the stdlib test harness.

## Coverage

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

## Benchmarks

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

## Sources

- crates.io/crates/cargo-llvm-cov - coverage tool
- bheisler.github.io/criterion.rs - Criterion docs
