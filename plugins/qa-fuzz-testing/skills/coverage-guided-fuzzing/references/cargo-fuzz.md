# cargo-fuzz (Rust)

Per-engine reference for `coverage-guided-fuzzing`; the shared workflow
and fuzzer-choice routing live in [../SKILL.md](../SKILL.md).

## Overview

cargo-fuzz (per
[github.com/rust-fuzz/cargo-fuzz](https://github.com/rust-fuzz/cargo-fuzz))
requires **Rust nightly** because libFuzzer integration depends on
unstable compiler features.

For sanitiser pairing: cargo-fuzz auto-enables ASan by default
(per the cargo-fuzz README). See
[sanitizer-integration.md](sanitizer-integration.md)
for ASan + UBSan composition. For corpus discipline see
[corpus-management.md](corpus-management.md).

## When to use

- Fuzz testing a Rust crate (parser, decoder, format converter).
- Targets that benefit from structured input mutation via the
  `Arbitrary` trait.
- CI smoke fuzz alongside `cargo test`.

For raw libFuzzer in C/C++ with Rust FFI see
[libfuzzer.md](libfuzzer.md).

## Authoring

### Install

Per the cargo-fuzz README:

```bash
# Rust nightly is required
rustup install nightly

# Install cargo-fuzz
cargo install cargo-fuzz
```

### Initialise

In your crate root:

```bash
cargo fuzz init
```

This creates a `fuzz/` subdirectory:

```
fuzz/
  Cargo.toml
  fuzz_targets/
    fuzz_target_1.rs       # generated default target
```

### Add a fuzz target

```bash
cargo fuzz add parse_query
```

Creates `fuzz/fuzz_targets/parse_query.rs`:

```rust
#![no_main]
use libfuzzer_sys::fuzz_target;
use my_crate::parser;

fuzz_target!(|data: &[u8]| {
    let _ = parser::parse_query(data);
});
```

Per the cargo-fuzz docs, `fuzz_target!` is the macro that wires up
the libFuzzer entry point (`LLVMFuzzerTestOneInput` under the
hood). The closure body is what runs per input.

### Structured input via `Arbitrary`

Raw byte slices work for binary formats; for structured inputs use
the `arbitrary` crate:

```rust
#![no_main]
use libfuzzer_sys::fuzz_target;
use arbitrary::Arbitrary;

#[derive(Debug, Arbitrary)]
struct Request {
    host: String,
    port: u16,
    body: Vec<u8>,
}

fuzz_target!(|req: Request| {
    let _ = handle_request(&req.host, req.port, &req.body);
});
```

Add `arbitrary = { version = "1", features = ["derive"] }` to
`fuzz/Cargo.toml`.

## Running

### Basic run

```bash
# Nightly toolchain required
cargo +nightly fuzz run parse_query
```

This builds the target with libFuzzer instrumentation + ASan and
runs indefinitely.

### Common options

| Option | Effect |
|---|---|
| `--release` | Release-mode build (faster, less debug info) |
| `--debug-assertions` | Keep debug assertions in release mode |
| `--sanitizer=<name>` | `address` (default), `leak`, `memory`, `thread`, `none` |
| `--jobs=N` | Parallel workers |
| `--no-default-features` | Disable default cargo-fuzz features |
| `-- <libFuzzer-flag>` | Pass through to libFuzzer (e.g., `-max_total_time=300`) |

```bash
cargo +nightly fuzz run parse_query -- -max_total_time=300
```

### Sanitiser variants

UBSan (via `--sanitizer=none` + custom `RUSTFLAGS`) and MSan variants:
see "Sanitiser variants" below.

### Reproducing a crash

```bash
cargo +nightly fuzz run parse_query \
  fuzz/artifacts/parse_query/crash-<sha1>
```

Or:

```bash
cargo +nightly fuzz fmt parse_query \
  fuzz/artifacts/parse_query/crash-<sha1>
# Prints the crash input in a Rust-readable format
```

### Crash artefacts location

Per cargo-fuzz convention:

```
fuzz/
  corpus/
    parse_query/            # evolved corpus
  artifacts/
    parse_query/
      crash-<sha1>          # crash artefacts
      leak-<sha1>
      timeout-<sha1>
```

## Parsing results

Sanitiser report format is identical to libFuzzer / ASan - see
[sanitizer-integration.md](sanitizer-integration.md)
"Reading a sanitiser report", and the "Reading a sanitiser report"
section below for the ASan report anatomy (bug class, access, stack,
allocation site).

`cargo fuzz fmt` decodes binary inputs into a Rust-readable form
(useful when using `Arbitrary` - recovers the struct).

## CI integration

Smoke-fuzz every target for 5 min on each PR (nightly toolchain,
cached corpus, uploaded artifacts): see "Full CI job" below.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Using stable toolchain | cargo-fuzz needs nightly | `rustup install nightly`; use `cargo +nightly fuzz` |
| Raw `&[u8]` for structured input | Mutation hits format errors more than logic | Use `Arbitrary` + a custom struct |
| Empty seed corpus | Fuzzer wanders; slow path discovery | Drop a few representative inputs in `fuzz/corpus/<target>/` |
| Ignoring `--release` | Debug builds slow iteration | Use `--release` for long campaigns |
| No `cargo fuzz fmt` on crash | Hard-to-read crash inputs | Always `cargo fuzz fmt` before filing a bug |
| Committing `fuzz/artifacts/` to repo | Repo bloat | `.gitignore` artifacts; persist via CI cache |
| Mixing fuzz targets in one file | Cargo treats each `fuzz_targets/*.rs` as one binary | One file per target |

## Limitations

- **Nightly-only.** Stable Rust doesn't support the required
  unstable features. Pin a known-good nightly date to avoid
  drift.
- **Build time.** First build is slow (rebuilds dependencies with
  sanitiser instrumentation).
- **`Arbitrary` derive is shallow.** Custom types need manual
  `impl Arbitrary` for non-trivial mutation strategies.
- **Cross-target corpus is per-target.** `fuzz/corpus/<target>/` - 
  no sharing across targets.
- **macOS / Windows partial support.** Linux is the primary
  platform; some features (MSan) Linux-only.

## References

- cargo-fuzz - 
  [github.com/rust-fuzz/cargo-fuzz](https://github.com/rust-fuzz/cargo-fuzz).
- cargo-fuzz book - 
  [rust-fuzz.github.io/book](https://rust-fuzz.github.io/book/).
- `arbitrary` crate - 
  [docs.rs/arbitrary](https://docs.rs/arbitrary/).
- `libfuzzer-sys` crate - 
  [docs.rs/libfuzzer-sys](https://docs.rs/libfuzzer-sys/).
- Composes:
  [sanitizer-integration.md](sanitizer-integration.md),
  [corpus-management.md](corpus-management.md).
- Sibling fuzzers:
  [libfuzzer.md](libfuzzer.md),
  [afl-plus-plus.md](afl-plus-plus.md),
  [go-native-fuzzing.md](go-native-fuzzing.md),
  [atheris.md](atheris.md),
  [jazzer.md](jazzer.md),
  OSS-Fuzz ([google.github.io/oss-fuzz](https://google.github.io/oss-fuzz/)).
- Umbrella: [../SKILL.md](../SKILL.md) - fuzzer choice + shared workflow.

## Sanitiser variants

```bash
# UBSan via none sanitiser + custom RUSTFLAGS
RUSTFLAGS="-Cpasses=sancov-module -Cllvm-args=-sanitizer-coverage-level=4 -Zsanitizer=undefined" \
  cargo +nightly fuzz run --sanitizer=none parse_query

# MSan
cargo +nightly fuzz run --sanitizer=memory parse_query
```

## Reading a sanitiser report

Report format is identical to libFuzzer / ASan (per
[clang.llvm.org/docs/AddressSanitizer.html](https://clang.llvm.org/docs/AddressSanitizer.html)):

```
==1234==ERROR: AddressSanitizer: heap-buffer-overflow on address 0x7f...
READ of size 4 at 0x7f... thread T0
    #0 0x4015a3 in process_input src/parser.rs:42:5
    #1 0x4012f0 in rust_fuzzer_test_input parse_query.rs:8:5
0x7f... is located 0 bytes to the right of 16-byte region [0x7f..., 0x7f...)
allocated by thread T0 here:
    #0 0x40e7c0 in __interceptor_malloc
```

- **Bug class:** `heap-buffer-overflow`, `stack-use-after-return`,
  `use-after-free`, `double-free`, `memory-leak`.
- **Access:** READ or WRITE, plus size.
- **Stack:** top frame is the crash site; frames below are the call
  chain down to the fuzz target entry point.
- **Allocation site:** where the corrupted memory was allocated.
- **Freed site:** on use-after-free, where it was freed.

## Full CI job

```yaml
jobs:
  fuzz:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: dtolnay/rust-toolchain@nightly
      - run: cargo install cargo-fuzz
      - uses: actions/cache@v4
        with:
          path: |
            fuzz/corpus
            ~/.cargo/registry
            target
          key: fuzz-${{ github.sha }}
          restore-keys: fuzz-
      - name: Smoke fuzz (5 min per target)
        run: |
          for target in $(cargo fuzz list); do
            timeout 300 cargo +nightly fuzz run $target -- -max_total_time=300 || true
          done
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: fuzz-artifacts
          path: fuzz/artifacts/
```
