---
name: corpus-management-reference
description: "Pure-reference catalog of fuzz-corpus management practices. Defines what a corpus is (seed corpus + evolved corpus saved by the fuzzer), corpus directory layout per libFuzzer / AFL++ / Go native / cargo-fuzz / OSS-Fuzz, the canonical crash-artefact naming (crash-<sha1> / leak-<sha1> / timeout-<sha1>), seed corpus construction strategies (sample-from-prod, sample-from-test-fixtures, from-spec-keywords), corpus minimisation, dictionary files, and the OSS-Fuzz integration corpus sync. Use as the corpus-discipline reference when building a fuzz target or maintaining a long-running fuzz campaign."
rating: 24
d6: 4
archetype: S2
---

# corpus-management-reference

## Overview

Pure-reference catalog of corpus-management practices across
libFuzzer, AFL++, native Go fuzz, cargo-fuzz, Atheris, Jazzer,
and OSS-Fuzz. Consumed by the per-language fuzzer skills and
the fuzz-target authoring agent.

## When to use

- Bootstrapping a new fuzz target — what should the seed corpus
  contain?
- Running a long-running fuzz campaign — when to minimise, where
  to back up, how to share across CI runs.
- Debugging a crash — locating the crash artefact, reproducing it.
- Migrating between fuzzers (libFuzzer ↔ AFL++) — corpus format
  compatibility.

## Corpus components

A fuzzing corpus has three roles:

| Role | What it is | Where it lives |
|---|---|---|
| **Seed corpus** | Hand-curated initial inputs covering known interesting paths | Versioned in repo (`fuzz/seeds/`) |
| **Evolved corpus** | Inputs the fuzzer added because they hit new coverage | Output directory (`fuzz/corpus/`) — typically not committed |
| **Crash artefacts** | Inputs that triggered a sanitiser / crash / timeout | Output directory + bug-report attachments |

## Directory layout per fuzzer

### libFuzzer

Per [llvm.org/docs/LibFuzzer.html](https://llvm.org/docs/LibFuzzer.html):

```
fuzz/
  fuzz_target.cc       # the harness
  seeds/               # initial inputs (read on startup)
  corpus/              # evolved corpus (read + written)
  fuzz_target          # compiled binary
```

Invocation:

```bash
./fuzz_target -max_total_time=3600 corpus/ seeds/
```

The first directory listed is the **output corpus** (writable);
subsequent directories are read-only seeds.

Crash artefacts saved to current directory as `crash-<sha1>`,
`leak-<sha1>`, `timeout-<sha1>` per LLVM docs.

### AFL++

```
fuzz/
  inputs/              # seed corpus
  output/              # AFL++ output (queue/, crashes/, hangs/)
  fuzz_target          # AFL-instrumented binary (afl-clang-fast)
```

Invocation:

```bash
afl-fuzz -i inputs/ -o output/ -- ./fuzz_target @@
```

Crash format: `output/default/crashes/id:<num>,sig:<signal>,src:<id>,op:<mutator>,...`.

AFL++ corpora are **not directly compatible** with libFuzzer — the
queue files have a different on-disk format. Convert via
`afl-fuzz -i` + `afl-cmin` round-trip.

### Go native (`go test -fuzz`)

Per [go.dev/doc/security/fuzz](https://go.dev/doc/security/fuzz):

```
package/
  fuzz_test.go         # contains FuzzXxx functions
  testdata/
    fuzz/
      FuzzXxx/
        seedfile1      # seed inputs (hand-curated)
        seedfile2
```

Failures auto-write to `testdata/fuzz/FuzzXxx/` with a generated
filename — they're meant to be committed as regression cases.

### cargo-fuzz

```
fuzz/
  Cargo.toml
  fuzz_targets/
    fuzz_target_1.rs   # the harness (one per fuzz target)
  corpus/
    fuzz_target_1/     # per-target corpus
  artifacts/
    fuzz_target_1/
      crash-<sha1>
```

Invocation:

```bash
cargo fuzz run fuzz_target_1
```

### Atheris (Python)

```
fuzz/
  fuzz_target.py       # uses atheris.Setup + atheris.Fuzz
  corpus/
```

Invocation (Atheris uses libFuzzer's CLI under the hood):

```bash
python fuzz_target.py corpus/
```

### Jazzer (JVM)

```
fuzz/
  FuzzTarget.java      # with @FuzzTest annotation
  corpus/
```

Invocation:

```bash
jazzer --cp=target/test-classes \
       --target_class=com.example.FuzzTarget \
       corpus/
```

### OSS-Fuzz

OSS-Fuzz aggregates corpora across Google's infrastructure:

```
oss-fuzz/
  projects/<project>/
    Dockerfile         # build the fuzzer
    build.sh           # produces $OUT/fuzz_target_1, $OUT/fuzz_target_1_seed_corpus.zip
```

Per [google.github.io/oss-fuzz](https://google.github.io/oss-fuzz/).

The corpus syncs to `gs://<project>-corpus.clusterfuzz-external.appspot.com/`.

## Seed corpus construction strategies

| Strategy | When | Example |
|---|---|---|
| **From spec keywords** | New target, no inputs exist | Extract JSON keywords from a JSON parser spec, write each as a tiny file |
| **From test fixtures** | Existing unit-test inputs cover paths | Copy fixtures from `tests/fixtures/*.json` to `seeds/` |
| **From production data** | Mature target, prod logs available | Sample 1000 prod requests, strip PII per [`pii-categories-reference`](../../../qa-test-data-privacy/skills/pii-categories-reference/SKILL.md), seed |
| **From corpus minimisation** | Reduce a large corpus to its coverage-equivalent core | Run `afl-cmin` or `libFuzzer -merge=1` |
| **From OSS-Fuzz cousin** | Same format, different target | Reuse `<format>_seed_corpus.zip` from a related OSS-Fuzz project |

A seed corpus of 5-50 hand-curated diverse inputs is typically
enough to bootstrap. Bigger isn't always better — the fuzzer
finds new paths via mutation.

## Dictionary files

A dictionary lists tokens the fuzzer prefers when mutating. For a
JSON parser:

```
# fuzz.dict
"{"
"}"
"["
"]"
"true"
"false"
"null"
"\":\""
```

Invocation: `libFuzzer -dict=fuzz.dict` or `afl-fuzz -x fuzz.dict`.

Dictionaries dramatically improve fuzzer effectiveness on
structured formats (JSON, XML, protobuf, SQL).

## Corpus minimisation

A corpus that grows over time becomes redundant — many inputs hit
the same coverage. Minimise periodically:

```bash
# libFuzzer merge mode
mkdir minimised/
./fuzz_target -merge=1 minimised/ corpus/

# AFL++ minimisation
afl-cmin -i corpus/ -o minimised/ -- ./fuzz_target @@

# Per-input minimisation (find smallest input triggering same coverage)
afl-tmin -i crash-input -o min-crash-input -- ./fuzz_target @@
```

Minimisation reduces fuzz cycle time + reproducibility surface.

## Crash artefact handling

When the fuzzer finds a crash:

1. **Reproduce locally:**
   ```bash
   ./fuzz_target crash-<sha1>
   # Triggers the same sanitiser report
   ```
2. **Minimise the crash input** (see above) so the bug report is
   small.
3. **File the bug** via
   [`bug-report-from-failure`](../../../qa-defect-management/skills/bug-report-from-failure/SKILL.md)
   with the minimised crash as an attachment.
4. **Add the original (non-minimised) crash to the seed corpus**
   as a regression test — re-runs will catch reintroduction.

## CI integration

Long-running fuzz campaigns run continuously; CI runs short
"smoke fuzz" campaigns (~5 min):

```yaml
- name: Smoke fuzz
  run: ./fuzz_target -max_total_time=300 corpus/ seeds/
```

Persist evolved corpus to a CI cache so coverage accumulates
across runs:

```yaml
- uses: actions/cache@v4
  with:
    path: corpus/
    key: fuzz-corpus-${{ github.sha }}
    restore-keys: fuzz-corpus-
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| No seed corpus | Fuzzer wanders randomly; takes hours to find shallow bugs | Always provide 5-50 hand-curated seeds |
| Committing evolved corpus to repo | Repo bloats; PR diffs hide signal | Persist via CI cache or object storage |
| Mixing seed and evolved corpus in one directory | Loses provenance | Separate directories; seeds read-only |
| No dictionary for structured formats | Fuzzer spends cycles re-discovering keywords | Always provide a dict for JSON / XML / protobuf / SQL |
| Never minimising | Cycle time grows; coverage redundant | Minimise weekly or per major change |
| Crash artefact deleted after fix | Lose regression coverage | Add minimised crash to seed corpus |
| Single fuzzer assumed | Different fuzzers find different bugs | Run libFuzzer + AFL++ on same target periodically |
| Sharing prod-sourced corpus without PII review | GDPR / HIPAA leak | Pass corpus through PII detection before sharing |

## Limitations

- **Corpus format incompatibility.** libFuzzer / AFL++ / cargo-fuzz
  corpora aren't directly swap-compatible; cross-fuzzer testing
  needs conversion.
- **Corpus rot.** Evolved corpora are tied to a specific binary's
  coverage instrumentation; rebuilding the target may invalidate
  some coverage information.
- **Dictionary maintenance.** Dictionaries should evolve with the
  target's grammar — manual upkeep.
- **Corpus storage.** Long campaigns produce GB-scale corpora;
  needs deliberate storage strategy (S3 / GCS / artifacts).
- **No semantic seeding for opaque formats.** Custom binary
  formats may need a generator to bootstrap coverage.

## References

- LLVM libFuzzer —
  [llvm.org/docs/LibFuzzer.html](https://llvm.org/docs/LibFuzzer.html).
- AFL++ docs — [github.com/AFLplusplus/AFLplusplus/blob/stable/docs](https://github.com/AFLplusplus/AFLplusplus/blob/stable/docs/).
- Go native fuzzing — [go.dev/doc/security/fuzz](https://go.dev/doc/security/fuzz).
- cargo-fuzz — [github.com/rust-fuzz/cargo-fuzz](https://github.com/rust-fuzz/cargo-fuzz).
- OSS-Fuzz — [google.github.io/oss-fuzz](https://google.github.io/oss-fuzz/).
- Sibling references:
  [`sanitiser-integration-reference`](../sanitiser-integration-reference/SKILL.md).
- Consumed by:
  [`libfuzzer-cpp`](../libfuzzer-cpp/SKILL.md),
  [`afl-plus-plus`](../afl-plus-plus/SKILL.md),
  [`go-native-fuzzing`](../go-native-fuzzing/SKILL.md),
  [`cargo-fuzz-rust`](../cargo-fuzz-rust/SKILL.md),
  [`atheris-python-fuzzing`](../atheris-python-fuzzing/SKILL.md),
  [`jazzer-jvm-fuzzing`](../jazzer-jvm-fuzzing/SKILL.md),
  [`ossfuzz-integration`](../ossfuzz-integration/SKILL.md),
  [`fuzz-toolkit-dispatcher`](../fuzz-toolkit-dispatcher/SKILL.md),
  [`fuzz-target-author`](../../agents/fuzz-target-author.md).
