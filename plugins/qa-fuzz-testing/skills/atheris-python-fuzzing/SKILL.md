---
name: atheris-python-fuzzing
description: "Author and run Atheris - Google's Python coverage-guided fuzzer built on libFuzzer. Covers pip installation, atheris.Setup + atheris.Fuzz invocation, TestOneInput(data: bytes) target signature, FuzzedDataProvider for structured input, instrument_imports() / instrument_func decorators for coverage instrumentation, and libFuzzer-passthrough flags (-atheris_runs, -max_total_time, -dict). Use for fuzzing Python libraries - also supports CPython native-extension fuzzing."
rating: 22
d6: 4
---

# atheris-python-fuzzing

## Overview

Atheris (per
[github.com/google/atheris](https://github.com/google/atheris))
supports both pure-Python and native-extension targets (CPython
C extensions).

For sanitiser pairing on native extensions, see
[`sanitiser-integration-reference`](../sanitiser-integration-reference/SKILL.md);
for corpus discipline see
[`corpus-management-reference`](../corpus-management-reference/SKILL.md).

## When to use

- Fuzz testing a Python library (parser, serialiser, validator).
- Native CPython extensions where the C/C++ code is reachable
  from Python.
- Quick fuzz pass during development on Python projects already
  using pytest.

## Authoring

### Install

```bash
pip install atheris
```

Per the Atheris README, prebuilt wheels include libFuzzer for
pure-Python fuzzing. Native-extension fuzzing may require building
from source so the Clang and libFuzzer versions match.

### Basic fuzz target

```python
# fuzz_parser.py
import sys
import atheris

with atheris.instrument_imports():
    from my_library import parser

def TestOneInput(data):
    parser.parse(data)

atheris.Setup(sys.argv, TestOneInput)
atheris.Fuzz()
```

Per Atheris README:

- `TestOneInput(data: bytes)` is the fuzz callback - invoked
  with mutated input bytes each iteration.
- `atheris.Setup(sys.argv, TestOneInput)` initialises the fuzzer
  with libFuzzer flags from `sys.argv`.
- `atheris.Fuzz()` starts the fuzz loop (doesn't return until
  the campaign ends).

### Coverage instrumentation

Atheris needs to instrument the modules under test:

```python
with atheris.instrument_imports():
    from my_library import parser, decoder
```

The `instrument_imports()` context manager monkey-patches the
import system so subsequent imports are coverage-instrumented.
Module-level imports above this context manager are NOT
instrumented - the fuzzer is blind to their code.

Alternative: per-function instrumentation:

```python
import my_library
my_library.parser.parse = atheris.instrument_func(my_library.parser.parse)
```

Or instrument-all (heavyweight):

```python
atheris.instrument_all()
```

### FuzzedDataProvider

For structured input, use the Python equivalent of libFuzzer's
helper:

```python
def TestOneInput(data):
    fdp = atheris.FuzzedDataProvider(data)
    port = fdp.ConsumeInt(4)              # signed 4-byte int
    is_https = fdp.ConsumeBool()
    host = fdp.ConsumeUnicode(64)         # up to 64 chars
    body_size = fdp.ConsumeIntInRange(0, 1024)
    body = fdp.ConsumeBytes(body_size)
    parser.parse_request(host, port, is_https, body)
```

Per Atheris README, the provider exposes `ConsumeInt`,
`ConsumeUnicode`, `ConsumeFloat`, `ConsumeBool`, `PickValueInList`,
and related methods.

## Running

### Basic run

```bash
python fuzz_parser.py
```

Atheris by default runs indefinitely. Pass libFuzzer-style flags:

```bash
python fuzz_parser.py -max_total_time=300 corpus/
```

The trailing directory is the corpus (read + write). Subsequent
directories are read-only seeds.

### Common flags

Per Atheris README, all libFuzzer flags pass through:

| Flag | Effect |
|---|---|
| `-max_total_time=N` | Stop after N seconds |
| `-atheris_runs=N` | Run N iterations then stop (also enables coverage report) |
| `-dict=path` | Use dictionary file |
| `-seed=N` | Random seed |
| `-runs=N` | libFuzzer runs (use `-atheris_runs` for Atheris-specific) |

### Coverage report

```bash
python fuzz_parser.py -atheris_runs=100000 corpus/
# At end: prints coverage statistics
```

### Reproducing a crash

```bash
python fuzz_parser.py crash-<sha1>
# Same crash with full traceback
```

## Parsing results

Python tracebacks instead of sanitiser reports (unless instrumenting
a CPython extension built with ASan):

```
[+] Loading binary contents from crash-abc123
=== Uncaught Python exception: ===
ValueError: invalid syntax
Traceback (most recent call last):
  File "fuzz_parser.py", line 12, in TestOneInput
    parser.parse(data)
  File "/path/my_library/parser.py", line 47, in parse
    return json.loads(text)
  ...
```

Map the traceback to a bug spec via
[`bug-report-from-failure`](../../../qa-defect-management/skills/bug-report-from-failure/SKILL.md).

## CI integration

```yaml
- uses: actions/setup-python@v6
  with: { python-version: '3.12' }
- run: pip install atheris
- name: Smoke fuzz (3 min)
  run: timeout 180 python fuzz_parser.py -max_total_time=180 corpus/ || true
- uses: actions/upload-artifact@v4
  with:
    name: atheris-crashes
    path: crash-*
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Module imports above `instrument_imports()` | Coverage signal absent for those modules | Always import via `with atheris.instrument_imports(): ...` |
| No exception handling in `TestOneInput` | Expected exceptions (ValueError on bad input) count as crashes | Catch expected exceptions; only let unexpected ones propagate |
| Pure-Python target without instrumentation | Coverage is blind; fuzzer flailing | Always instrument |
| Missing `atheris.Fuzz()` call | Fuzz loop never starts | Always end with `atheris.Fuzz()` |
| Treating every traceback as a bug | Many tracebacks are spec-compliant (raising ValueError on invalid input is correct) | Use `assert` for invariants; let spec-defined exceptions through |
| Native extension without ASan | C bugs silent (segfault crashes Python interpreter) | Build CPython + extension with ASan for native fuzzing |

## Limitations

- **GIL bottleneck.** Python single-thread iteration; no
  multi-process fuzzing without `-jobs` (and libFuzzer's job
  flag works imperfectly with Python).
- **Slower than libFuzzer / cargo-fuzz.** Pure-Python iteration
  is ~1000-10000 execs/sec - orders of magnitude slower than C.
- **Coverage instrumentation overhead.** ~5x slowdown for
  instrumented modules.
- **Native-extension fuzzing requires C/C++ toolchain.** Build
  CPython + the extension with matching ASan / libFuzzer
  versions.
- **No structured-input mutation beyond FuzzedDataProvider.** For
  structured-aware mutation (typed records, custom grammars), pair
  with Hypothesis (in
  [`qa-property-based`](../../../qa-property-based/skills/hypothesis-testing/SKILL.md))
  for property-based-style structured input.

## References

- Atheris - 
  [github.com/google/atheris](https://github.com/google/atheris).
- LLVM libFuzzer (underlying) - 
  [llvm.org/docs/LibFuzzer.html](https://llvm.org/docs/LibFuzzer.html).
- Composes:
  [`sanitiser-integration-reference`](../sanitiser-integration-reference/SKILL.md),
  [`corpus-management-reference`](../corpus-management-reference/SKILL.md).
- Sibling fuzzers:
  [`libfuzzer-cpp`](../libfuzzer-cpp/SKILL.md),
  [`afl-plus-plus`](../afl-plus-plus/SKILL.md),
  [`cargo-fuzz-rust`](../cargo-fuzz-rust/SKILL.md),
  [`go-native-fuzzing`](../go-native-fuzzing/SKILL.md),
  [`jazzer-jvm-fuzzing`](../jazzer-jvm-fuzzing/SKILL.md),
  [`ossfuzz-integration`](../ossfuzz-integration/SKILL.md).
- Sibling-plugin overlap:
  [`hypothesis-testing`](../../../qa-property-based/skills/hypothesis-testing/SKILL.md) - different methodology (hypothesis-driven vs coverage-guided).
- Dispatcher:
  [`fuzz-toolkit-dispatcher`](../fuzz-toolkit-dispatcher/SKILL.md).
