# cargo-fuzz: sanitiser variants, crash reports, and CI

Deep reference for `cargo-fuzz-rust`. The core install / init / add /
run / reproduce workflow lives in the skill spine; this file holds the
advanced sanitiser variants, the ASan report anatomy, and the CI job.

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

## CI integration

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
