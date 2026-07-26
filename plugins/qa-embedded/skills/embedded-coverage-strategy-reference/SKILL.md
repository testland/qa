---
name: embedded-coverage-strategy-reference
description: "Pure-reference catalog of code-coverage strategy for embedded C/C++: the criteria hierarchy (statement / branch / decision / condition / MC/DC), the gcov toolchain (.gcno/.gcda, --coverage), the LLVM source-based toolchain (llvm-profdata / llvm-cov), host-build vs QEMU-build instrumentation, MISRA-C:2012 and DO-178C structural-coverage expectations by safety level (DAL A maps to MC/DC), and report-format choices. Use when choosing what structural-coverage level to require and wiring gcov / llvm-cov into the build; physical .gcda retrieval from hardware is in hardware-in-loop-reference, QEMU machine flags in qemu-system-test-runner, and to author the embedded tests themselves use googletest-embedded-arm or unity-test-framework-c."
metadata:
  keywords: "coverage, gcov, llvm-cov, mcdc, misra, do-178c, embedded"
---

# embedded-coverage-strategy-reference

## Overview

This skill is a **pure reference** consumed by the per-tool
skills (`googletest-embedded-arm`,
`unity-test-framework-c`,
`ceedling-build-runner`,
`qemu-system-test-runner`)
and by the HIL reference
(`hardware-in-loop-reference`).

## When to use

- Choosing a coverage criterion for a new embedded test suite - 
  what does "enough coverage" mean for this project?
- Wiring gcov or llvm-cov into the cross-compile build.
- Reading a coverage report and translating between gcov, LCOV,
  and llvm-cov formats.
- Negotiating coverage requirements against a safety standard
  (MISRA-C, DO-178C, ISO 26262, IEC 62304).
- Deciding whether to instrument the host build, the QEMU build,
  or the on-target build.

## How to use

1. Pick the coverage **criterion** the project's safety level demands (DAL A / ASIL D map to MC/DC; DAL B to decision; DAL C / ASIL A to statement) from the criteria hierarchy - full standards mapping in [references/safety-standards-and-formats.md](references/safety-standards-and-formats.md).
2. Pick the **toolchain**: gcov for GCC / ARM-GCC / AVR-GCC; LLVM source-based coverage for clang (MC/DC needs clang `-fcoverage-mcdc`).
3. **Instrument** the build at `-O0` (`--coverage` for gcc; `-fprofile-instr-generate -fcoverage-mapping` for clang) - never optimise a coverage build.
4. Pick **where to run** (host / QEMU / on-target) from the instrumentation trade-off table.
5. Produce **`lcov.info`** as the durable artefact, render HTML for the developer, and gate the PR on changed-line coverage - see Coverage gates that work.

The full gcov-to-HTML path for a single module is in Worked example below.

## Coverage criteria hierarchy

The standard hierarchy, from weakest to strongest. ISTQB
glossary terms (cite by stable term ID; the glossary is a JS SPA
and not WebFetchable):

| Criterion | What it requires | ISTQB term ID |
|---|---|---|
| **Statement coverage** | Every executable statement executed at least once | "statement coverage" |
| **Branch coverage** | Each branch of every decision point taken in both directions | "branch coverage" |
| **Decision coverage** | Each decision (e.g. `if (x)`) evaluated both true and false | "decision coverage" |
| **Condition coverage** | Each atomic boolean condition in a compound decision evaluated both true and false | "condition coverage" |
| **MC/DC (Modified Condition/Decision Coverage)** | Each condition independently affects the decision outcome | "modified condition decision coverage" |
| **Multiple-condition coverage** | All combinations of conditions in a decision exercised | "multiple condition coverage" |

The escalation matters because higher criteria find different
defect classes - branch coverage finds an unreached `else`;
MC/DC finds a short-circuit-evaluated condition whose change
never alters the decision.

## gcov toolchain (GCC, ARM-GCC, AVR-GCC)

Per [gcc.gnu.org/onlinedocs/gcc/Invoking-Gcov.html](https://gcc.gnu.org/onlinedocs/gcc/Invoking-Gcov.html):

### Compilation

Build the program (or test harness) with `--coverage` - a
convenience alias that "tells the compiler to generate additional
information needed by gcov (basically a flow graph of the
program) and also includes additional code in the object files
for generating the extra profiling information" (per the GCC
gcov invocation page).

```bash
arm-none-eabi-gcc --coverage -O0 -g \
    main.c parser.c tests.c -o test_binary
# Equivalent to: -fprofile-arcs -ftest-coverage -lgcov
```

Compilation produces a `.gcno` file (flow-graph) per source file
"at compile time". Running the binary produces a `.gcda` file
per source file with the accumulated execution counts (both per
the GCC docs).

### Running gcov

```bash
./test_binary           # writes parser.gcda etc.
gcov -b -c parser.c     # produces parser.c.gcov text report
```

The full gcov flag table and the `.gcov` annotation sentinels
(`#####` for unexecuted, `-` for non-executable) are in
[references/gcov-flag-reference.md](references/gcov-flag-reference.md).

### LCOV info format

For HTML reports + CI integration, post-process with
`lcov`/`genhtml`:

```bash
lcov --capture --directory . --output-file coverage.info
genhtml coverage.info --output-directory coverage-html/
```

LCOV's `.info` is the de-facto interchange format consumed by
Codecov, Coveralls, SonarQube. (LCOV is not GCC; it is a
separate Linux Test Project tool that wraps `gcov`.)

## LLVM source-based coverage (clang, arm-linux-clang)

Per [clang.llvm.org/docs/SourceBasedCodeCoverage.html](https://clang.llvm.org/docs/SourceBasedCodeCoverage.html):

### Compilation

```bash
clang --target=arm-none-eabi \
      -fprofile-instr-generate -fcoverage-mapping \
      -O0 -g main.c parser.c tests.c -o test_binary
```

The two flags are independent: `-fprofile-instr-generate`
enables "instrumentation based profiling"; `-fcoverage-mapping`
emits the mapping that "describes the mapping between the source
ranges and the profiling instrumentation counters" (per the
LLVM Coverage Mapping Format docs at
[llvm.org/docs/CoverageMappingFormat.html](https://llvm.org/docs/CoverageMappingFormat.html)).

For MC/DC, add `-fcoverage-mcdc` per the Clang docs.

### Running + profile merge

Running the binary writes `default.profraw` in the current
directory (or to the path in `LLVM_PROFILE_FILE`, with pattern
strings `%p` for PID, `%h` for hostname, `%Nm` for merge-pool - 
per the Clang docs).

```bash
LLVM_PROFILE_FILE="raw/%p.profraw" ./test_binary
llvm-profdata merge -sparse raw/*.profraw -o test.profdata
```

`-sparse` "produces smaller indexed profiles" (per Clang docs).

### Reports

```bash
llvm-cov show   ./test_binary -instr-profile=test.profdata \
                              -format=html -output-dir=cov-html/
llvm-cov report ./test_binary -instr-profile=test.profdata
llvm-cov export ./test_binary -instr-profile=test.profdata \
                              -format=lcov > coverage.info
```

`show` emits per-line annotations, `report` emits the
file-level summary table, `export -format=lcov` produces a file
compatible with the gcov-flavoured LCOV `.info` consumed by
Codecov / SonarQube. (Per the same Clang Source-Based Code
Coverage page.)

### LLVM coverage mapping regions

The LLVM coverage-mapping format (per
[llvm.org/docs/CoverageMappingFormat.html](https://llvm.org/docs/CoverageMappingFormat.html))
distinguishes:

- **Code regions** - associate source ranges with counters.
- **Skipped regions** - preprocessor-excluded code (e.g.
  `#ifdef` branches not taken at compile time).
- **Expansion regions** - macro expansions, so a macro that
  fires from multiple call sites has separate coverage per site.
- **Branch regions** - true / false condition paths (added with
  `-fcoverage-mapping`).

This region taxonomy is why llvm-cov can show separate counts
inside macro expansions - gcov cannot.

## On-target vs host vs QEMU instrumentation

A practical trade-off for embedded teams:

| Approach | Coverage accuracy | Cost | Notes |
|---|---|---|---|
| **Host build** (same source, x86_64 toolchain, no MCU) | Misses MCU-specific paths | Lowest | Default for Ceedling per [throwtheswitch.org/ceedling](https://www.throwtheswitch.org/ceedling); use when business logic dominates |
| **QEMU system emulation** | Catches arch-specific paths (endianness, alignment) | Medium | See `qemu-system-test-runner`; reports written to host filesystem via virtio / semihosting |
| **On-target with semihosting** | Highest fidelity | Highest (flash space, RAM for counters) | `.gcda` files written back via semihosting; needs ARM `--specs=rdimon.specs` (`librdimon` is the gcc-arm-none-eabi semihosting library - see [developer.arm.com toolchain docs](https://developer.arm.com/Tools%20and%20Software/GNU%20Toolchain)) |
| **On-target with file-system shim** | High | High | Counters streamed over UART / SWO; host re-assembles `.gcda` |

For most safety-critical projects, the standard recipe is
**host build for fast loop, QEMU build for arch sanity, on-target
build for the certification artefact**.

## Worked example

gcov branch coverage on one module, host build (the fast-loop
default from the instrumentation table).

```bash
# 1. instrument + build on the host at -O0 (writes parser.gcno at compile time)
gcc --coverage -O0 -g parser.c parser_test.c -o parser_test

# 2. run - writes parser.gcda next to parser.gcno
./parser_test

# 3. branch counts as a text report
gcov -b -c parser.c          # -> parser.c.gcov (scan for ##### lines)

# 4. interchange artefact + HTML for the team
lcov --capture --directory . --output-file coverage.info
genhtml coverage.info --output-directory coverage-html/

# 5. gate the PR on coverage.info branch totals
```

The host loop is fastest, but it misses MCU-specific paths -
pair it with at least one QEMU or on-target run before claiming
the number for the MCU (see the instrumentation table and the
"coverage measured on host then claimed for the MCU"
anti-pattern below).

## Safety-standard coverage expectations

Coverage targets are set by the project's safety standard, not by
taste. DAL A / ASIL D demand MC/DC; DAL B demands decision
coverage; DAL C / ASIL A demand statement coverage; MISRA-C:2012
and IEC 62304 Class C prescribe no numeric target but expect a
structural-coverage justification. The full per-standard table
(DO-178C DAL A-D, ISO 26262 ASIL A-D, MISRA-C:2012 §8, IEC 62304)
is in [references/safety-standards-and-formats.md](references/safety-standards-and-formats.md).
Treat every listed level as the *floor*, not a turnkey recipe.

## Coverage report formats

Produce `lcov.info` as the durable artefact, render HTML for the
developer, and gate on the `.info` totals. gcov also emits text
`.gcov` and `.gcov.json.gz`; llvm-cov emits `.profdata`, HTML,
and lcov / JSON exports; `gcovr --xml` produces Cobertura for
Jenkins. The full producer / consumer matrix is in
[references/safety-standards-and-formats.md](references/safety-standards-and-formats.md).

## Coverage gates that work

| Gate | Why |
|---|---|
| **Per-file branch coverage minimum** (e.g. 80% per file, 90% per function with `__attribute__((critical))`) | Catches unreviewed new code without holding back legacy files |
| **No regressions on changed lines** | PR-scoped; lets the absolute number drift down only for code not touched |
| **MC/DC on annotated decisions** (clang `-fcoverage-mcdc` + a `_MCDC` decorator) | Targets the cost where the standard demands it |

A flat "global ≥85% branch" gate is the failure mode - it
penalises the team for unreviewed legacy code and rewards
removing tests for hard-to-cover error paths.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Optimising the test build with `-O2` | gcov / llvm-cov measure post-optimisation flow; branches collapse | Use `-O0` for the coverage build per GCC gcov docs guidance |
| Mixing gcov and llvm-cov artefacts | `.gcno` and `.profraw` come from different toolchains; tools can't merge them | Pick one toolchain per build; document why |
| Coverage of test code counted as product coverage | Inflates numbers | Exclude `tests/`, `mocks/`, `framework/` directories in lcov / llvm-cov filter |
| MC/DC reported from gcov | gcov doesn't measure MC/DC | Use `clang -fcoverage-mcdc` per the Clang Source-Based Coverage page; gcov gives at best condition coverage via `-b` |
| Coverage measured on host then claimed for the MCU | Endianness / alignment / weak-symbol paths uncovered | Pair host coverage with at least one QEMU or on-target run |
| Counters compiled but never written back from MCU | `.gcda` missing; gcov sees only the `.gcno` flow-graph and reports 0% | Implement `_write` / `_exit` semihosting hook; ARM `--specs=rdimon.specs` per [developer.arm.com GNU toolchain](https://developer.arm.com/Tools%20and%20Software/GNU%20Toolchain) |

## Limitations

- **Statement coverage is the weakest meaningful target** - a
  100%-statement-covered suite can miss every `else` branch.
- **Branch coverage from gcov has known imprecision on
  short-circuit `&&` / `||`** - these compile to two branches;
  the count attributes to the source line, not the individual
  operand. For per-operand visibility, use clang
  `-fcoverage-mcdc` per the Clang docs.
- **`.gcda` files accumulate across runs.** Re-run without
  deleting them and counters keep climbing. Use
  `__gcov_reset()` (provided by `libgcov`) to zero between
  scenarios - per the gcov source.
- **Counter overflow.** Default counters are 64-bit on modern
  GCC but were 32-bit historically - on a long-running
  on-target run, check `gcov-tool overlap` for saturated counts.
- **No path coverage from either toolchain.** Path coverage
  ("path coverage" per ISTQB) is exponential and neither gcov nor
  llvm-cov measures it. For path-sensitive testing pair with
  fuzzing or symbolic execution.

## References

Cited inline above. Foundational documents:

- GCC gcov manual - 
  [gcc.gnu.org/onlinedocs/gcc/Invoking-Gcov.html](https://gcc.gnu.org/onlinedocs/gcc/Invoking-Gcov.html).
- Clang Source-Based Code Coverage - 
  [clang.llvm.org/docs/SourceBasedCodeCoverage.html](https://clang.llvm.org/docs/SourceBasedCodeCoverage.html).
- LLVM Coverage Mapping Format - 
  [llvm.org/docs/CoverageMappingFormat.html](https://llvm.org/docs/CoverageMappingFormat.html).
- ARM GNU Toolchain docs (for `--specs=rdimon.specs` semihosting) - 
  [developer.arm.com/Tools and Software/GNU Toolchain](https://developer.arm.com/Tools%20and%20Software/GNU%20Toolchain).
- ISTQB glossary V4.7.1 terms cited by stable term ID (glossary
  is a JS SPA at glossary.istqb.org - not WebFetchable).
- MISRA-C:2012 §8 Coverage Guidance (gated standard - cite by
  stable ID).
- DO-178C §6.4.4 Structural Coverage (gated standard - cite by
  stable ID).
- ISO 26262-6:2018 Table 12 (gated standard - cite by stable ID).
- Deep references (with their own citations): the full gcov flag
  table in [references/gcov-flag-reference.md](references/gcov-flag-reference.md);
  the safety-standard mapping and report-format matrix in
  [references/safety-standards-and-formats.md](references/safety-standards-and-formats.md).
