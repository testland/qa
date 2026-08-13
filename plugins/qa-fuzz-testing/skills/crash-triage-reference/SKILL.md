---
name: crash-triage-reference
description: "Reference catalog for triaging fuzzer crash artifacts - reading ASan, UBSan, and MSan output; classifying findings as LIKELY-EXPLOITABLE, MEDIUM, or BENIGN; deduplicating by stack-hash; minimizing reproducers with -minimize_crash; plus the bulk triage workflow for a full artifact directory (inventory, reproduce, classify, dedupe, BLOCK/PASS verdict with refuse-to-proceed rules and a report template). Use when you need to understand what a specific crash means, build exploitability intuition, work a set of findings by hand, or run a campaign-level triage that ends in a release verdict."
---

# crash-triage-reference

## Overview

Pure-reference catalog for working with fuzzer crash artifacts produced by
libFuzzer, AFL++, or cargo-fuzz campaigns using clang sanitisers. Covers
reading crash output from ASan, UBSan, and MSan; distinguishing
LIKELY-EXPLOITABLE from BENIGN findings; collapsing duplicates by stack-hash;
and minimizing reproducers. The "Bulk triage workflow" section applies these
steps across a full artifact directory and ends in a BLOCK / PASS verdict.
For sanitiser build flags and compatibility, see
`coverage-guided-fuzzing` `references/sanitizer-integration.md`.

## When to use

- Reading a raw ASan / UBSan / MSan crash report and identifying the bug class.
- Deciding whether a finding blocks a release (LIKELY-EXPLOITABLE) or is a
  lower-priority issue (MEDIUM or BENIGN).
- Collapsing 20 crash artifacts into N unique bugs before filing tickets.
- Reducing a crash input to its minimal reproducer before attaching it to a bug.
- Triaging a whole campaign's artifact directory into a release verdict
  (see "Bulk triage workflow").

## Reading ASan crash output

AddressSanitizer (per
[clang.llvm.org/docs/AddressSanitizer.html](https://clang.llvm.org/docs/AddressSanitizer.html))
reports all memory errors through a structured output block. The `==ERROR:` line
always carries the bug class, and the access line carries the direction (READ
or WRITE) and size.

Annotated example:

```
==1234==ERROR: AddressSanitizer: heap-buffer-overflow on address 0x7f...
WRITE of size 4 at 0x7f... thread T0            <-- direction + size
    #0 0x4015a3 in process_input src/parser.c:42:5
    #1 0x4012f0 in LLVMFuzzerTestOneInput fuzz_target.cc:10:3
    #2 ...
0x7f... is located 0 bytes to the right of 16-byte region [0x7f..., 0x7f...)
allocated by thread T0 here:                     <-- allocation site
    #0 0x40e7c0 in __interceptor_malloc
    #1 0x4015a3 in process_input src/parser.c:39:9
freed by thread T0 here:                         <-- deallocation site (UAF only)
    #0 0x40e8b0 in __interceptor_free
    ...
```

Key fields (per
[clang.llvm.org/docs/AddressSanitizer.html](https://clang.llvm.org/docs/AddressSanitizer.html)):

| Field | Location in output | What to extract |
|---|---|---|
| Bug class | `==ERROR: AddressSanitizer: <class>` line | e.g. `heap-buffer-overflow`, `use-after-free` |
| Access direction | `READ` / `WRITE` of size N | determines exploitability tier |
| Crash site | `#0` frame after `==ERROR` | source file + line of the fault |
| Allocation site | after `allocated by thread T0 here:` | where the corrupted memory came from |
| Deallocation site | after `freed by thread T0 here:` | present only for use-after-free |

ASan detects: out-of-bounds accesses to heap, stack, and globals; use-after-free;
double-free; invalid free; memory leaks (per
[clang.llvm.org/docs/AddressSanitizer.html](https://clang.llvm.org/docs/AddressSanitizer.html)).
It does not produce false positives.

## Reading UBSan crash output

UndefinedBehaviorSanitizer (per
[clang.llvm.org/docs/UndefinedBehaviorSanitizer.html](https://clang.llvm.org/docs/UndefinedBehaviorSanitizer.html))
uses a `runtime error:` prefix rather than `==ERROR:`:

```
src/math.c:17:5: runtime error: signed integer overflow: 2147483647 + 1 cannot be represented in type 'int'
```

The general pattern is: `<file>:<line>: runtime error: <check>: <detail>`.

Common UBSan check identifiers to recognize:

| Identifier in output | Check |
|---|---|
| `signed integer overflow:` | Signed overflow; per UBSan docs |
| `division by zero` | Integer divide-by-zero |
| `null pointer dereference` | Null pointer use |
| `misaligned address` | Alignment violation |
| `index N out of bounds` | Array subscript OOB (static bounds) |
| `load of value N is not valid for type` | Invalid enum / bool load |
| `call to function through pointer to incorrect function type` | Function-pointer type mismatch |

UBSan's runtime is "not expected to produce false positives" (per
[clang.llvm.org/docs/UndefinedBehaviorSanitizer.html](https://clang.llvm.org/docs/UndefinedBehaviorSanitizer.html)),
but its production use needs care: recovery modes that continue execution
instead of aborting can mask bugs from the fuzzer. Always build with
`-fno-sanitize-recover=all` for fuzzing (see `coverage-guided-fuzzing`
`references/sanitizer-integration.md`).

## Reading MSan crash output

MemorySanitizer (per
[clang.llvm.org/docs/MemorySanitizer.html](https://clang.llvm.org/docs/MemorySanitizer.html))
reports with a `WARNING:` prefix rather than `==ERROR:`:

```
WARNING: MemorySanitizer: use-of-uninitialized-value
    #0 0x... in check_header src/decode.c:55
    ...
Uninitialized value was created by a heap allocation
    #0 0x... in parse_frame src/decode.c:22
```

When built with `-fsanitize-memory-track-origins` the report also shows where
the uninitialised value was created and the intermediate stores it passed
through. Without origins, the report names only the use site, making root
cause harder to locate (per
[clang.llvm.org/docs/MemorySanitizer.html](https://clang.llvm.org/docs/MemorySanitizer.html)).

MSan findings classify as MEDIUM by default (uninitialized reads rarely give
an attacker write primitives), but escalate if the value flows into a branch
that controls a WRITE operation.

## Exploitability classification

Classify each deduplicated finding by the bug class and access direction. The
access direction (`READ` vs `WRITE`) is in the ASan line immediately after
`==ERROR:`.

| Bug class | Direction | Exploitability | Rationale |
|---|---|---|---|
| `heap-buffer-overflow` | WRITE | LIKELY-EXPLOITABLE | Attacker-controlled write to adjacent heap; classic exploitation primitive |
| `use-after-free` | WRITE | LIKELY-EXPLOITABLE | Write to freed memory; allocator-reuse exploitation |
| `double-free` / `invalid-free` | any | LIKELY-EXPLOITABLE | Corrupts allocator metadata; exploitation is well-documented |
| `heap-buffer-overflow` | READ | MEDIUM | Leaks heap contents; information disclosure |
| `use-after-free` | READ | MEDIUM | Information disclosure; no write primitive directly |
| `stack-buffer-overflow` | WRITE | MEDIUM | Stack corruption; exploitability depends on stack layout |
| `stack-buffer-overflow` | READ | MEDIUM | Stack disclosure |
| `signed integer overflow` | any | MEDIUM | Context-dependent; may widen to a write if used as an array index |
| `null pointer dereference` | any | BENIGN | Crash-only in user-space protected-zero-page model |
| `memory-leak` | any | BENIGN | DoS risk only; no memory corruption |
| `use-of-uninitialized-value` (MSan) | - | MEDIUM | Information disclosure or branch confusion; escalate if controls a WRITE |
| `division by zero` | any | BENIGN | Process termination; no memory corruption |
| `timeout` / OOM artifact | any | BENIGN | Denial-of-service risk only |

Note: LIKELY-EXPLOITABLE is a triage signal, not a CVE severity. A security
engineer must confirm before disclosure.

## Deduplication by stack-hash

libFuzzer saves one artifact per unique crash input. A single bug can produce
dozens of artifacts with slightly different inputs. Deduplicate before counting
bugs.

Stack-hash key: take the top 3 non-sanitiser frames from the symbolised `#N`
lines of the crash report. Exclude frames whose function names contain
`sanitizer`, `interceptor`, or `LLVMFuzzerTestOneInput` - they are harness
frames, not the fault site.

```bash
# Extract top 3 meaningful frames and hash them
grep -E '^\s+#[0-9]+ 0x' /tmp/report.txt \
  | grep -v 'sanitizer\|interceptor\|LLVMFuzzerTestOneInput' \
  | head -3 \
  | sha1sum | cut -c1-8
```

Artifacts sharing the same 8-character stack-hash represent the same bug. Keep
the smallest artifact per hash - it is the easiest reproducer to attach to a
bug report.

If the binary was built without `-g` (no debug info), the `#N` lines carry only
hex addresses. The hash still works for dedup within a campaign but loses
file/line attribution needed for bug tickets. Always build fuzz targets with
`-g -O1` (per
[clang.llvm.org/docs/AddressSanitizer.html](https://clang.llvm.org/docs/AddressSanitizer.html)
and the libFuzzer build examples at
[llvm.org/docs/LibFuzzer.html](https://llvm.org/docs/LibFuzzer.html)).

## Reproducer minimization with `-minimize_crash`

A crash artifact produced during fuzzing is often much larger than necessary.
Minimizing it reduces review time, makes root-cause analysis easier, and
produces a cleaner bug-report attachment.

libFuzzer's `-minimize_crash=1` flag reduces the crash input to its smallest
form that still reproduces the same crash (per
[llvm.org/docs/LibFuzzer.html](https://llvm.org/docs/LibFuzzer.html)):

```bash
# Minimize a single crash artifact
# -minimize_crash=1 requires a time or run budget
./fuzz_target -minimize_crash=1 \
  -max_total_time=60 \
  -exact_artifact_path=./minimized_crash \
  ./crash-a3f2c1b0

# Or bound by iteration count instead of time
./fuzz_target -minimize_crash=1 \
  -runs=10000 \
  -exact_artifact_path=./minimized_crash \
  ./crash-a3f2c1b0
```

The `-exact_artifact_path` flag writes the minimized result to a single named
file instead of using the default checksum-prefixed naming; `-artifact_prefix`
can be used instead to write to a directory (per
[llvm.org/docs/LibFuzzer.html](https://llvm.org/docs/LibFuzzer.html)).

For AFL++ crashes, use `afl-tmin` (from the AFL++ toolchain) rather than
libFuzzer minimization - they use different transport formats.

After minimization, re-run the minimized artifact to confirm it still triggers
the same crash class and the same stack-hash before attaching it to the bug
report:

```bash
ASAN_OPTIONS=abort_on_error=1:symbolize=1 \
UBSAN_OPTIONS=print_stacktrace=1:halt_on_error=1 \
  ./fuzz_target -runs=1 ./minimized_crash 2>&1
```

The `-runs=1` flag re-runs the file as a single test input without fuzzing, as
described in the libFuzzer options at
[llvm.org/docs/LibFuzzer.html](https://llvm.org/docs/LibFuzzer.html).

## Artifact naming quick-reference

libFuzzer saves artifacts with a class prefix followed by a content checksum
(per [llvm.org/docs/LibFuzzer.html](https://llvm.org/docs/LibFuzzer.html)):

| Artifact prefix | Meaning |
|---|---|
| `crash-<sha1>` | Input triggered a crash or sanitiser abort |
| `leak-<sha1>` | Input triggered LSan memory-leak detection |
| `timeout-<sha1>` | Input exceeded `-timeout` wall-clock limit |
| `oom-<sha1>` | Input exceeded `-rss_limit_mb` in fork mode |

AFL++ crash artifacts land under `output/default/crashes/` with filenames of
the form `id:N,sig:N,src:N,...`. They carry the same information but require
symbolization separately via the AFL++ target binary - the class is not encoded
in the filename.

## Bulk triage workflow

Applying the sections above across a full artifact directory turns a
campaign's output into a release verdict. Read-only: this workflow reports
findings, it never fixes, deletes, or minimises artifacts in place.

1. **Inventory.** List artifacts by class prefix and count them:

   ```bash
   # libFuzzer: working dir or -artifact_prefix path
   ls -1 "$ARTIFACT_DIR"/crash-* "$ARTIFACT_DIR"/leak-* \
         "$ARTIFACT_DIR"/timeout-* 2>/dev/null | sort
   # AFL++: output/default/crashes/ and output/default/hangs/
   ls -1 "$AFL_OUT"/default/crashes/ "$AFL_OUT"/default/hangs/ 2>/dev/null
   ```

2. **Reproduce every artifact** against the current binary and capture the
   sanitiser report - never classify from memory of what a crash
   "probably means":

   ```bash
   ASAN_OPTIONS=abort_on_error=1:symbolize=1 \
   UBSAN_OPTIONS=print_stacktrace=1:halt_on_error=1 \
     ./fuzz_target -runs=1 "$artifact" 2>&1 | tee /tmp/report_"$sha".txt
   ```

3. **Classify** each report using the ASan / UBSan / MSan sections above;
   `timeout-` / `oom-` artifacts classify by prefix.
4. **Deduplicate by stack-hash** (see "Deduplication by stack-hash");
   unique hashes = unique bugs; keep the smallest artifact per hash.
5. **Flag exploitability** per the classification table above.
6. **Verdict**: **BLOCK** if any deduplicated finding is
   LIKELY-EXPLOITABLE; **PASS** if all findings are MEDIUM or BENIGN
   (surface them in the report - fix before next release, but they do not
   gate the current build).

Report template:

```markdown
## Fuzz triage report - <campaign-id>

**Fuzzer:** libFuzzer 18.x / AFL++ 4.x / cargo-fuzz
**Artifact dir:** fuzz/artifacts/
**Total artifacts:** 14 | **Unique bugs (after dedup):** 5
**Verdict:** BLOCK - 1 LIKELY-EXPLOITABLE finding

### LIKELY-EXPLOITABLE (must fix before release)

| Stack-hash | Class | Access | Resource | Artifact |
|---|---|---|---|---|
| `a3f2c1b0` | heap-overflow | WRITE 4 bytes | `src/parser.c:87` | `crash-a3f2...` |

### MEDIUM (fix before next release)
### BENIGN (log; no release gate)
```

**Refuse-to-proceed rules.** The triage refuses to:

- Emit a PASS verdict while any unclassified artifact remains - classify
  all before the verdict.
- Mark any artifact BENIGN without completing classification (silent
  unclassified failures are the dominant triage failure mode).
- Modify, delete, or minimise artifacts during triage (minimise with
  `afl-tmin` / `-minimize_crash=1` as a separate step).
- Synthesise a verdict without re-running the artifact against the
  binary (step 2).
- Skip deduplication: a raw artifact count is not a bug count.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Counting raw artifact files as bug count | One bug produces many artifacts with varied inputs | Deduplicate by stack-hash first |
| Classifying BENIGN without checking direction | A `heap-buffer-overflow` READ is MEDIUM, not BENIGN | Always read the READ/WRITE line before classifying |
| Minimizing before verifying the stack-hash match | Minimized input may trigger a different code path | Confirm stack-hash matches after minimization |
| Treating integer-overflow as always BENIGN | May feed into an index that drives a WRITE | Trace the value's use before downgrading to BENIGN |
| Skipping `-g` in fuzz target builds | Stack traces become raw hex; dedup still works but root cause is unattributable | Always build with `-g -O1` |
| Filing bugs on un-minimized artifacts | Large inputs slow review and bisection | Run `-minimize_crash=1` before filing |

## Limitations

- **Exploitability is heuristic.** The READ/WRITE distinction is a strong
  signal but not a definitive CVE assessment. A security engineer must
  review LIKELY-EXPLOITABLE findings before disclosure.
- **JVM and Go formats differ.** This reference covers clang sanitiser output
  only. Jazzer (JVM) and Go native-fuzz panics use different report formats
  and need manual class mapping.
- **MSan origin tracking requires a full recompile.** Without
  `-fsanitize-memory-track-origins`, the report names only the use site; tracing
  the value back to its source requires rebuilding all dependencies with MSan
  instrumentation (per
  [clang.llvm.org/docs/MemorySanitizer.html](https://clang.llvm.org/docs/MemorySanitizer.html)).
- **AFL++ crash class is not in the filename.** Unlike libFuzzer, AFL++ does not
  encode the bug class in the artifact name; symbolization is a separate step.
- **Minimization can obscure secondary bugs.** The minimized input exercises a
  narrower code path. Keep the original artifact alongside the minimized one.

## References

- LLVM AddressSanitizer (bug classes, READ/WRITE output, allocation/dealloc
  site reporting, `abort_on_error`):
  [clang.llvm.org/docs/AddressSanitizer.html](https://clang.llvm.org/docs/AddressSanitizer.html)
- LLVM UndefinedBehaviorSanitizer (runtime error format, check identifiers,
  `-fno-sanitize-recover=all`):
  [clang.llvm.org/docs/UndefinedBehaviorSanitizer.html](https://clang.llvm.org/docs/UndefinedBehaviorSanitizer.html)
- LLVM MemorySanitizer (`use-of-uninitialized-value` output, origin tracking):
  [clang.llvm.org/docs/MemorySanitizer.html](https://clang.llvm.org/docs/MemorySanitizer.html)
- LLVM libFuzzer (artifact naming, `-minimize_crash`, `-runs`, `-exact_artifact_path`,
  `-artifact_prefix`, `-rss_limit_mb`):
  [llvm.org/docs/LibFuzzer.html](https://llvm.org/docs/LibFuzzer.html)
- Sibling skill: `coverage-guided-fuzzing` - the umbrella whose
  `references/sanitizer-integration.md` (build flags, sanitiser
  compatibility) and `references/corpus-management.md` (corpus
  discipline, seed selection) feed this triage
