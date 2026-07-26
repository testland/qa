---
name: ossfuzz-integration
description: "Author and submit a project to Google OSS-Fuzz - the open-source continuous fuzzing service that runs libFuzzer / AFL++ / Honggfuzz campaigns on Google infrastructure 24x7. Covers the project.yaml + Dockerfile + build.sh contract, the $OUT/$WORK conventions, supported languages + sanitisers, seed-corpus + dictionary submission, the OSS-Fuzz Build Status dashboard, and the disclosure SLA (issues filed in Monorail with 90-day deadline). Use to offload long-running fuzz campaigns to dedicated infrastructure rather than self-hosting."
---

# ossfuzz-integration

## Overview

OSS-Fuzz (per
[google.github.io/oss-fuzz](https://google.github.io/oss-fuzz/))
runs libFuzzer / AFL++ / Honggfuzz campaigns 24x7 on Google
Cloud across multiple sanitiser configurations (ASan, UBSan,
MSan), auto-files bug reports with crash reproducers, and tracks
fix status with a 90-day disclosure SLA.

For corpus discipline see
`corpus-management-reference`;
for sanitiser pairing see
`sanitiser-integration-reference`.

## When to use

- Production-grade fuzzing of an open-source library - OSS-Fuzz
  runs continuously, finds bugs you'd miss with periodic CI fuzz.
- Established projects with mature fuzz targets - OSS-Fuzz wants
  proven harnesses, not experimental ones.
- Pre-disclosure pipeline for security-sensitive libraries - 
  OSS-Fuzz files in Monorail with structured severity + 90-day
  deadline.

For commercial / closed-source projects: ClusterFuzz (the open-source
backend behind OSS-Fuzz) can be self-hosted.

## How to use

1. Confirm the project qualifies: open-source, with a mature harness (>=10k execs/sec locally) rather than an experimental one.
2. Create `projects/<project-name>/` with `project.yaml`, `Dockerfile`, and `build.sh` per [references/project-contract.md](references/project-contract.md).
3. Build and validate locally: `infra/helper.py build_image`, then `build_fuzzers --sanitizer address`, then `check_build`.
4. Ship a seed corpus (`<target>_seed_corpus.zip`) and, for structured formats, a dictionary (`<target>.dict`) beside the target.
5. Open a pull request to `github.com/google/oss-fuzz`; the OSS-Fuzz team reviews security, scope, and maintainer verification.
6. On merge, watch the Build Status dashboard and triage Monorail issues (reproduce with `infra/helper.py reproduce`) within the 90-day disclosure deadline.

## Authoring

Each project lives at `projects/<project-name>/` with three files: `project.yaml`
(metadata - language, fuzzing_engines, sanitizers, contacts), a `Dockerfile` that
builds the fuzz targets on `base-builder`, and a `build.sh` that produces
`$OUT/<fuzz_target>` plus seed corpora. Verify locally with `infra/helper.py`
before opening the PR.

Full field-by-field contract, file templates, and the local-testing commands:
[references/project-contract.md](references/project-contract.md).

## Running

### Submitting a new project

1. Open a pull request to
   [github.com/google/oss-fuzz](https://github.com/google/oss-fuzz)
   adding `projects/<project-name>/`.
2. OSS-Fuzz team reviews (security + scope + maintainer
   verification).
3. On merge, the project enters the 24x7 fuzzing rotation.
4. Build status appears at
   [oss-fuzz-build-logs.storage.googleapis.com](https://oss-fuzz-build-logs.storage.googleapis.com/index.html).

### Receiving findings

Bugs are filed in Monorail (issues.oss-fuzz.com) with:

- Crash reproducer attached
- Sanitiser output
- Severity classification
- Auto-CC to project contacts
- 90-day disclosure deadline (per Google's standard disclosure
  policy)

After the 90-day deadline, unfixed bugs become public.

### Updating an existing project

Fork -> modify -> PR. Common changes:

- New fuzz targets (additional `*.cc` + `build.sh` updates)
- Refreshed seed corpora
- Sanitiser additions (turn on MSan once dependencies are
  instrumented)
- Maintainer contact updates

## Parsing results

OSS-Fuzz crash artefact format matches libFuzzer's. The Monorail
issue includes:

- **Crash reproducer**: download from Monorail attachment;
  reproduce locally:
  ```bash
  python infra/helper.py reproduce <project-name> fuzz_target_1 <crash-file>
  ```
- **Sanitiser output**: the report stack + alloc / free sites
- **Coverage info**: which lines were hit by the input

Feed this to `bug-report-from-failure`
for downstream bug-tracker filing.

## Worked example

A maintainer wants continuous fuzzing for a JPEG decoder library. They add
`projects/jpeg-decoder/` with `language: c`, `fuzzing_engines: [libfuzzer, afl]`,
`sanitizers: [address, undefined]`, and `primary_contact` set. `build.sh` compiles
the decoder and links `decompress_fuzzer` against `$LIB_FUZZING_ENGINE`, then copies
`decompress_fuzzer_seed_corpus.zip` (sample JPEGs) to `$OUT`. Locally,
`python infra/helper.py check_build jpeg-decoder` passes. They open the PR; OSS-Fuzz
merges it about a week later. A few days in, Monorail files a `heap-buffer-overflow`
in the Huffman decoder with an attached reproducer. They run
`python infra/helper.py reproduce jpeg-decoder decompress_fuzzer crash-abc123`,
confirm the bug, patch it, and the issue closes before the 90-day deadline.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Submitting an experimental harness | Slow path discovery wastes OSS-Fuzz compute | Mature harness locally first; ≥10k execs/sec |
| No seed corpus | Wastes first weeks rediscovering shallow inputs | Submit `<target>_seed_corpus.zip` with the project |
| No dictionary for structured formats | Slow grammar discovery | Submit `<target>.dict` |
| Fuzz target builds incompletely with MSan | Build matrix slot wasted | Skip MSan in `project.yaml` until dependencies instrumented |
| Stale `main_repo` URL | OSS-Fuzz pulls from wrong branch | Keep `main_repo` current |
| Missing primary_contact / auto_ccs | Bug reports go nowhere | Always set contact emails |
| Fix-then-ignore | Disclosure deadline still applies; the bug becomes public 90 days later | Fix within deadline OR request extension |

## Limitations

- **Open-source only.** Closed-source projects use ClusterFuzz
  self-hosted, not OSS-Fuzz.
- **Maintainer review required.** New project PRs need approval - 
  cycle time 1-4 weeks.
- **Severity classification is automated.** OSS-Fuzz heuristic
  may misclassify; maintainer can re-tag in Monorail.
- **Resource allocation is opaque.** Google decides how much
  compute to allocate per project.
- **Builds break on dependency drift.** When upstream
  dependencies change, build.sh may break - monitor the build
  status page.

## References

- OSS-Fuzz - 
  [google.github.io/oss-fuzz](https://google.github.io/oss-fuzz/).
- New project guide - 
  [google.github.io/oss-fuzz/getting-started/new-project-guide](https://google.github.io/oss-fuzz/getting-started/new-project-guide/).
- ClusterFuzz (self-hosted backend) - 
  [google.github.io/clusterfuzz](https://google.github.io/clusterfuzz/).
- Monorail (issue tracker) - issues.oss-fuzz.com.
- Project contract detail: [references/project-contract.md](references/project-contract.md).
- Composes:
  `corpus-management-reference`,
  `sanitiser-integration-reference`.
- Sibling fuzzers:
  `libfuzzer-cpp`,
  `afl-plus-plus`,
  `cargo-fuzz-rust`,
  `atheris-python-fuzzing`,
  `jazzer-jvm-fuzzing`,
  `go-native-fuzzing`.
- Dispatcher:
  `fuzz-tool-selector`.
