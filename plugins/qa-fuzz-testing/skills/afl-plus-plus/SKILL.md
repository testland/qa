---
name: afl-plus-plus
description: "Author and run AFL++ - out-of-process coverage-guided fuzzer (a community fork of Google's original AFL with improved mutations and instrumentation). Covers afl-cc / afl-clang-fast instrumented build, afl-fuzz invocation, parallel master/slave (-M / -S), dictionary support (-x), QEMU mode (-Q) for binaries without source, output structure (queue / crashes / hangs), and CI integration. Use for fuzzing standalone binaries (file processors, command-line tools) where libFuzzer's in-process model doesn't fit."
rating: 23
d6: 4
---

# afl-plus-plus

## Overview

Distinct from libFuzzer (in-process) - AFL++ (per
[github.com/AFLplusplus/AFLplusplus](https://github.com/AFLplusplus/AFLplusplus))
fits binaries you can't compile-in (closed-source, multi-language)
and tools that process inputs end-to-end (parsers reading files,
decoders reading stdin).

For sanitiser pairing see
[`sanitiser-integration-reference`](../sanitiser-integration-reference/SKILL.md);
for corpus discipline see
[`corpus-management-reference`](../corpus-management-reference/SKILL.md).

## When to use

- Fuzzing a file-format parser whose API isn't directly callable.
- Targeting a binary you don't have source for (QEMU mode).
- Parallel campaigns across many cores via master/slave.
- Comparison fuzzing - different mutation strategies catch
  different bugs than libFuzzer.

## Authoring

### Install

Per AFL++ README:

```bash
# Docker
docker pull aflplusplus/aflplusplus
docker run -ti -v /location/of/your/target:/src aflplusplus/aflplusplus

# Or apt (Debian/Ubuntu)
apt-get install -y afl++
```

For local build see `docs/INSTALL.md` in the AFL++ repo.

### Instrument the target

```bash
CC=afl-cc CXX=afl-c++ ./configure --disable-shared
make clean all
```

Or LLVM-based (recommended):

```bash
CC=afl-clang-fast CXX=afl-clang-fast++ make
```

`afl-clang-fast` produces ~3x faster instrumented binaries than
the legacy `afl-cc`.

Add sanitisers in the standard way:

```bash
AFL_USE_ASAN=1 AFL_USE_UBSAN=1 CC=afl-clang-fast \
  CFLAGS="-fno-sanitize-recover=all -fno-omit-frame-pointer -g" \
  make
```

`AFL_USE_ASAN` + `AFL_USE_UBSAN` env vars pass the sanitiser flags
through AFL's compiler driver.

## Running

### Basic invocation

```bash
./afl-fuzz -i seeds/ -o output/ -- ./target @@
```

Per AFL++ README:

- `-i seeds/` - input seed corpus
- `-o output/` - output directory (created if absent)
- `-- ./target @@` - target binary; `@@` is replaced by AFL with
  the input filename
- For stdin-driven targets, omit `@@`: `-- ./target` (AFL pipes
  the input)

### Common flags

| Flag | Effect |
|---|---|
| `-M name` | Master process in parallel campaign |
| `-S name` | Secondary process (slave) |
| `-x dict.txt` | Use dictionary |
| `-t N` | Per-input timeout in ms (default 1000) |
| `-m N` | Memory limit per child (MB) |
| `-Q` | QEMU mode for non-instrumented binaries |
| `-c path` | CMPLog binary (companion mode for collisions) |
| `-d` | "Quick" mode - deterministic mutations skipped |

### Parallel fuzzing

```bash
# Terminal 1 — master
afl-fuzz -i seeds/ -o output/ -M main -- ./target @@

# Terminals 2..N — slaves
afl-fuzz -i seeds/ -o output/ -S slave1 -- ./target @@
afl-fuzz -i seeds/ -o output/ -S slave2 -- ./target @@
```

The master runs deterministic mutations; slaves run random
mutations. Output corpus is shared via the `output/` directory.

### QEMU mode

For closed-source binaries:

```bash
afl-fuzz -Q -i seeds/ -o output/ -- ./closed_source_target @@
```

QEMU instruments via dynamic binary translation. ~5x slower than
native instrumentation but works on any binary.

## Parsing results

Output directory structure:

```
output/
  fuzzer_stats           # current run metrics
  fuzzer_setup           # configuration
  plot_data              # gnuplot-friendly time series
  queue/
    id:000000,orig:seed1.bin
    id:000001,src:000000,op:...     # mutated from id 0 with op
    ...
  crashes/
    id:000000,sig:11,src:000123,op:havoc,rep:8
    README.txt
  hangs/
    id:000000,...
```

Crash filename encoding (per AFL++ docs):

- `id:N` - sequence number
- `sig:S` - signal (11=SEGV, 6=SIGABRT, 9=SIGKILL, etc.)
- `src:M` - derived from queue entry M
- `op:X` - mutation operator that produced it
- `rep:R` - repetition count

Reproduce a crash:

```bash
./target output/default/crashes/id:000000,sig:11,...
# Or for stdin-driven:
./target < output/default/crashes/id:000000,sig:11,...
```

For automated bug filing, parse the sanitiser output (if compiled
with `AFL_USE_ASAN=1`) via
[`bug-report-from-failure`](../../../qa-defect-management/skills/bug-report-from-failure/SKILL.md).

### Triaging crashes

`afl-tmin` minimises a single crash input:

```bash
afl-tmin -i output/default/crashes/id:000000,sig:11,... \
         -o minimised.bin \
         -- ./target @@
```

`afl-cmin` minimises the entire queue (corpus minimisation):

```bash
afl-cmin -i output/default/queue/ -o minimised_queue/ -- ./target @@
```

## CI integration

```yaml
- name: Install AFL++
  run: docker pull aflplusplus/aflplusplus
- name: Build instrumented target
  run: |
    docker run -v $PWD:/src aflplusplus/aflplusplus bash -c \
      "cd /src && CC=afl-clang-fast AFL_USE_ASAN=1 make"
- name: Smoke fuzz (5 min)
  run: |
    timeout 300 docker run -v $PWD:/src aflplusplus/aflplusplus \
      afl-fuzz -i /src/seeds -o /src/output -- /src/target @@ || true
- name: Upload crashes
  uses: actions/upload-artifact@v4
  with:
    name: afl-crashes
    path: output/default/crashes/
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Target compiled without AFL instrumentation | No coverage signal; fuzzer is blind | Use `afl-clang-fast` or `-Q` (QEMU) |
| `-i -` (continuation) without checking output state | Hard to resume; lost queue progress | Use canonical `-i seeds/` on fresh runs |
| Single AFL slave on a multi-core machine | 80% of cores idle | Run N-1 slaves in parallel |
| No `AFL_USE_ASAN=1` | Only catches crashes, not memory bugs | Always set sanitiser env vars |
| Treating `hangs/` as bugs | Often false positives (slow targets, infinite loops in test data) | Investigate; raise `-t` for slow targets |
| Long-running campaign without `afl-cmin` cycle | Queue bloats; cycle time degrades | Run `afl-cmin` weekly |
| Mixing AFL++ + libFuzzer corpora | Format incompatibility | Convert via `afl-fuzz -i corpus -E ... ` round-trip |

## Limitations

- **Out-of-process overhead.** Fork-per-input is slower than
  libFuzzer's in-process iteration (~100-1000 execs/sec vs
  10,000+).
- **Persistent mode partially mitigates.** `LLVMFuzzerTestOneInput`-like
  persistent harnesses approach libFuzzer speed but require
  source instrumentation.
- **Queue format isn't libFuzzer-compatible.** Cross-fuzzer
  corpus sharing requires conversion.
- **`hangs/` reports many false positives.** Slow but valid
  inputs sit there until manually triaged.
- **QEMU mode is slow** (~5x). Use only when source isn't
  available.
- **Linux-first.** macOS / Windows support exists but less mature.

## References

- AFL++ - 
  [github.com/AFLplusplus/AFLplusplus](https://github.com/AFLplusplus/AFLplusplus).
- AFL++ docs - 
  [github.com/AFLplusplus/AFLplusplus/blob/stable/docs](https://github.com/AFLplusplus/AFLplusplus/blob/stable/docs/).
- Original AFL paper - lcamtuf.coredump.cx/afl/ (Michał Zalewski's
  original AFL post; AFL++ extends).
- Composes:
  [`sanitiser-integration-reference`](../sanitiser-integration-reference/SKILL.md),
  [`corpus-management-reference`](../corpus-management-reference/SKILL.md).
- Sibling fuzzers:
  [`libfuzzer-cpp`](../libfuzzer-cpp/SKILL.md),
  [`cargo-fuzz-rust`](../cargo-fuzz-rust/SKILL.md),
  [`atheris-python-fuzzing`](../atheris-python-fuzzing/SKILL.md),
  [`jazzer-jvm-fuzzing`](../jazzer-jvm-fuzzing/SKILL.md),
  [`go-native-fuzzing`](../go-native-fuzzing/SKILL.md),
  [`ossfuzz-integration`](../ossfuzz-integration/SKILL.md).
- Dispatcher:
  [`fuzz-toolkit-dispatcher`](../fuzz-toolkit-dispatcher/SKILL.md).
