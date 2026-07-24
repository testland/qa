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

## Authoring

### Project layout in OSS-Fuzz repo

Per the OSS-Fuzz docs at
[google.github.io/oss-fuzz/getting-started/new-project-guide](https://google.github.io/oss-fuzz/getting-started/new-project-guide/),
each project lives at `projects/<project-name>/` and contains:

```
projects/<project-name>/
  project.yaml      # metadata: language, fuzzing_engines, sanitizers, primary_contact
  Dockerfile        # builds the fuzz targets
  build.sh          # produces $OUT/<fuzz_target_1> + seed corpora
```

### project.yaml

```yaml
homepage: "https://example.com/project"
language: c++   # or c, rust, go, python, jvm, swift
fuzzing_engines:
  - libfuzzer
  - afl
  - honggfuzz
sanitizers:
  - address
  - undefined
  - memory
primary_contact: "maintainer@example.com"
auto_ccs:
  - "security@example.com"
main_repo: "https://github.com/example/project"
```

Per the OSS-Fuzz docs, `language` drives which build template is
used; `fuzzing_engines` × `sanitizers` enumerates the build matrix
(libFuzzer + ASan, libFuzzer + UBSan, libFuzzer + MSan, AFL + ASan,
etc.).

### Dockerfile

```dockerfile
FROM gcr.io/oss-fuzz-base/base-builder

# Install dependencies
RUN apt-get update && apt-get install -y \
    cmake ninja-build

# Clone the source
RUN git clone --depth=1 https://github.com/example/project /src/project
WORKDIR /src/project

# Copy build script + seed corpus
COPY build.sh fuzz_target_1.cc fuzz_target_1_seed_corpus.zip $SRC/

WORKDIR /src/project
```

Per OSS-Fuzz docs, the base image (`base-builder`) provides
clang + libFuzzer + afl-clang-fast + sanitisers preinstalled.
Language-specific base images exist (`base-builder-rust`,
`base-builder-go`, `base-builder-jvm`, etc.).

### build.sh

```bash
#!/bin/bash -eu
# OSS-Fuzz sets $OUT, $WORK, $CC, $CXX, $CFLAGS, $CXXFLAGS, $LIB_FUZZING_ENGINE

# Build the library
cd /src/project
mkdir -p build && cd build
cmake -G Ninja .. \
    -DCMAKE_BUILD_TYPE=Release \
    -DBUILD_SHARED_LIBS=OFF
ninja

# Build fuzz target
$CXX $CXXFLAGS \
    -I/src/project/include \
    /src/fuzz_target_1.cc \
    /src/project/build/libproject.a \
    $LIB_FUZZING_ENGINE \
    -o $OUT/fuzz_target_1

# Seed corpus
cp /src/fuzz_target_1_seed_corpus.zip $OUT/fuzz_target_1_seed_corpus.zip

# Dictionary (optional)
cp /src/fuzz_target_1.dict $OUT/fuzz_target_1.dict
```

Per OSS-Fuzz docs:

- `$OUT` is where final fuzz target binaries + seed corpora must
  land
- `$CXX` / `$CXXFLAGS` are pre-configured with the correct
  sanitiser + libFuzzer flags for the active build configuration
- `$LIB_FUZZING_ENGINE` links the libFuzzer / AFL driver
- Seed corpora ship as `<target>_seed_corpus.zip`
- Dictionaries ship as `<target>.dict`

### Local testing

Before submitting, verify locally with the helper script:

```bash
git clone https://github.com/google/oss-fuzz
cd oss-fuzz
python infra/helper.py build_image <project-name>
python infra/helper.py build_fuzzers --sanitizer address <project-name>
python infra/helper.py check_build <project-name>
python infra/helper.py run_fuzzer <project-name> fuzz_target_1
```

Per the OSS-Fuzz docs, `check_build` validates the harness will
run on Google infrastructure.

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

Fork → modify → PR. Common changes:

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
