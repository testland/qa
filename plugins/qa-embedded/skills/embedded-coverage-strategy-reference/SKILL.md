---
name: embedded-coverage-strategy-reference
description: "Pure-reference catalog of code-coverage strategy for embedded C/C++. Defines the coverage criteria hierarchy (statement / branch / decision / condition / MC/DC), the gcov toolchain (.gcno + .gcda files, -fprofile-arcs / -ftest-coverage / --coverage), the LLVM source-based coverage toolchain (-fprofile-instr-generate + -fcoverage-mapping, default.profraw, llvm-profdata merge, llvm-cov show/report/export), on-target vs host instrumentation trade-offs, MISRA-C:2012 and DO-178C structural-coverage expectations by safety level (DAL A → MC/DC), and report-format choices (gcov text, JSON, LCOV info, llvm-cov HTML). Use as the coverage-criterion reference when choosing what level of structural coverage to require for an embedded C/C++ project and when wiring gcov or llvm-cov into the build."
rating: 23
d6: 4
archetype: S2
keywords: ["coverage", "gcov", "llvm-cov", "mcdc", "misra", "do-178c", "embedded"]
---

# embedded-coverage-strategy-reference

## Overview

Embedded C/C++ projects sit on a coverage spectrum from "best
effort line coverage on the host" to "MC/DC measured on-target
for every flight-critical condition". The right point on that
spectrum is driven by the safety / regulatory regime, the
toolchain (gcc vs clang vs vendor compiler), and whether
instrumented binaries can run on the production target at all.

This skill is a **pure reference** consumed by the per-tool S1
skills ([`googletest-embedded-arm`](../googletest-embedded-arm/SKILL.md),
[`unity-test-framework-c`](../unity-test-framework-c/SKILL.md),
[`ceedling-build-runner`](../ceedling-build-runner/SKILL.md),
[`qemu-system-test-runner`](../qemu-system-test-runner/SKILL.md))
and by the HIL reference
([`hardware-in-loop-reference`](../hardware-in-loop-reference/SKILL.md)).

## When to use

- Choosing a coverage criterion for a new embedded test suite —
  what does "enough coverage" mean for this project?
- Wiring gcov or llvm-cov into the cross-compile build.
- Reading a coverage report and translating between gcov, LCOV,
  and llvm-cov formats.
- Negotiating coverage requirements against a safety standard
  (MISRA-C, DO-178C, ISO 26262, IEC 62304).
- Deciding whether to instrument the host build, the QEMU build,
  or the on-target build.

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
defect classes — branch coverage finds an unreached `else`;
MC/DC finds a short-circuit-evaluated condition whose change
never alters the decision.

## gcov toolchain (GCC, ARM-GCC, AVR-GCC)

Per [gcc.gnu.org/onlinedocs/gcc/Invoking-Gcov.html](https://gcc.gnu.org/onlinedocs/gcc/Invoking-Gcov.html):

### Compilation

Build the program (or test harness) with `--coverage` — a
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

Key flags from the same invocation page:

| Flag | Long form | Effect |
|---|---|---|
| `-a` | `--all-blocks` | Write per-basic-block counts |
| `-b` | `--branch-probabilities` | Write branch frequencies + summary to stdout |
| `-c` | `--branch-counts` | Branch frequencies as counts not percentages |
| `-f` | `--function-summaries` | Per-function coverage on top of file-level |
| `-n` | `--no-output` | Suppress the `.gcov` file |
| `-p` | `--preserve-paths` | Preserve full path in generated filenames |
| `-u` | `--unconditional-branches` | Include unconditional branches in `-b` output |
| `--json-format` | — | Emit `.gcov.json.gz` (gzip-compressed JSON, "does not require source code for generation") |

The text `.gcov` file annotates each source line with an
execution count (or `-` for non-executable, `#####` for
unexecuted).

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
strings `%p` for PID, `%h` for hostname, `%Nm` for merge-pool —
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

- **Code regions** — associate source ranges with counters.
- **Skipped regions** — preprocessor-excluded code (e.g.
  `#ifdef` branches not taken at compile time).
- **Expansion regions** — macro expansions, so a macro that
  fires from multiple call sites has separate coverage per site.
- **Branch regions** — true / false condition paths (added with
  `-fcoverage-mapping`).

This region taxonomy is why llvm-cov can show separate counts
inside macro expansions — gcov cannot.

## On-target vs host vs QEMU instrumentation

A practical trade-off for embedded teams:

| Approach | Coverage accuracy | Cost | Notes |
|---|---|---|---|
| **Host build** (same source, x86_64 toolchain, no MCU) | Misses MCU-specific paths | Lowest | Default for Ceedling per [throwtheswitch.org/ceedling](https://www.throwtheswitch.org/ceedling); use when business logic dominates |
| **QEMU system emulation** | Catches arch-specific paths (endianness, alignment) | Medium | See [`qemu-system-test-runner`](../qemu-system-test-runner/SKILL.md); reports written to host filesystem via virtio / semihosting |
| **On-target with semihosting** | Highest fidelity | Highest (flash space, RAM for counters) | `.gcda` files written back via semihosting; needs ARM `--specs=rdimon.specs` (`librdimon` is the gcc-arm-none-eabi semihosting library — see [developer.arm.com toolchain docs](https://developer.arm.com/Tools%20and%20Software/GNU%20Toolchain)) |
| **On-target with file-system shim** | High | High | Counters streamed over UART / SWO; host re-assembles `.gcda` |

For most safety-critical projects, the standard recipe is
**host build for fast loop, QEMU build for arch sanity, on-target
build for the certification artefact**.

## Safety-standard coverage expectations

These are cited by stable ID — the standards themselves are
gated and not WebFetchable.

| Standard / level | Minimum structural coverage |
|---|---|
| **MISRA-C:2012 Coverage Guidance** | No prescribed numeric target; the rule set requires *defined* control flow and explicit `default:` in `switch`, which makes branch coverage achievable. See "MISRA-C:2012 §8 Coverage" |
| **DO-178C / DAL A** (catastrophic failure) | MC/DC required for every condition (see "DO-178C §6.4.4 Structural Coverage") |
| **DO-178C / DAL B** | Decision coverage |
| **DO-178C / DAL C** | Statement coverage |
| **DO-178C / DAL D** | None mandated |
| **ISO 26262 ASIL D** | MC/DC strongly recommended for unit verification (see "ISO 26262-6:2018 Table 12") |
| **ISO 26262 ASIL A / B / C** | Branch (B/C) or statement (A) coverage |
| **IEC 62304 Class C** (medical, life-supporting) | No numeric target, but bidirectional traceability + structural coverage justification expected |

The number "100% MC/DC" in aviation is famously expensive; the
standard accepts "MC/DC of the integrated executable object code"
which is interpreted differently by certifiers. The S2 reader
should treat these as the *floor*, not a turnkey recipe.

## Coverage report formats

| Format | Producer | Consumer |
|---|---|---|
| `.gcov` (text) | `gcov` | Human reading; line-level annotation |
| `.gcov.json.gz` | `gcov --json-format` | CI parser; no source-code dependency per GCC docs |
| `.info` (LCOV) | `lcov --capture` or `llvm-cov export -format=lcov` | Codecov / Coveralls / SonarQube |
| `.profdata` | `llvm-profdata merge` | Input only to `llvm-cov` |
| HTML | `genhtml` (LCOV) or `llvm-cov show -format=html` | Humans; not for diff'ing |
| JSON | `llvm-cov export -format=text` | Custom CI dashboards |
| Cobertura XML | `gcovr --xml` (gcovr is a third-party gcov wrapper) | Jenkins coverage plugin |

For embedded CI, the rule of thumb is: produce `lcov.info` as
the durable artefact; render HTML for the developer; gate the PR
on the `.info` totals.

## Coverage gates that work

| Gate | Why |
|---|---|
| **Per-file branch coverage minimum** (e.g. 80% per file, 90% per function with `__attribute__((critical))`) | Catches unreviewed new code without holding back legacy files |
| **No regressions on changed lines** | PR-scoped; lets the absolute number drift down only for code not touched |
| **MC/DC on annotated decisions** (clang `-fcoverage-mcdc` + a `_MCDC` decorator) | Targets the cost where the standard demands it |

A flat "global ≥85% branch" gate is the failure mode — it
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

- **Statement coverage is the weakest meaningful target** — a
  100%-statement-covered suite can miss every `else` branch.
- **Branch coverage from gcov has known imprecision on
  short-circuit `&&` / `||`** — these compile to two branches;
  the count attributes to the source line, not the individual
  operand. For per-operand visibility, use clang
  `-fcoverage-mcdc` per the Clang docs.
- **`.gcda` files accumulate across runs.** Re-run without
  deleting them and counters keep climbing. Use
  `__gcov_reset()` (provided by `libgcov`) to zero between
  scenarios — per the gcov source.
- **Counter overflow.** Default counters are 64-bit on modern
  GCC but were 32-bit historically — on a long-running
  on-target run, check `gcov-tool overlap` for saturated counts.
- **No path coverage from either toolchain.** Path coverage
  ("path coverage" per ISTQB) is exponential and neither gcov nor
  llvm-cov measures it. For path-sensitive testing pair with
  fuzzing or symbolic execution.

## References

Cited inline above. Foundational documents:

- GCC gcov manual —
  [gcc.gnu.org/onlinedocs/gcc/Invoking-Gcov.html](https://gcc.gnu.org/onlinedocs/gcc/Invoking-Gcov.html).
- Clang Source-Based Code Coverage —
  [clang.llvm.org/docs/SourceBasedCodeCoverage.html](https://clang.llvm.org/docs/SourceBasedCodeCoverage.html).
- LLVM Coverage Mapping Format —
  [llvm.org/docs/CoverageMappingFormat.html](https://llvm.org/docs/CoverageMappingFormat.html).
- ARM GNU Toolchain docs (for `--specs=rdimon.specs` semihosting) —
  [developer.arm.com/Tools and Software/GNU Toolchain](https://developer.arm.com/Tools%20and%20Software/GNU%20Toolchain).
- ISTQB glossary V4.7.1 terms cited by stable term ID (glossary
  is a JS SPA at glossary.istqb.org — not WebFetchable).
- MISRA-C:2012 §8 Coverage Guidance (gated standard — cite by
  stable ID).
- DO-178C §6.4.4 Structural Coverage (gated standard — cite by
  stable ID).
- ISO 26262-6:2018 Table 12 (gated standard — cite by stable ID).
