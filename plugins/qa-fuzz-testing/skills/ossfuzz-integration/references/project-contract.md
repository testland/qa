# OSS-Fuzz project contract

The `projects/<project-name>/` file contract - `project.yaml`, `Dockerfile`,
`build.sh` - plus how to verify it locally before submitting.

## Project layout in OSS-Fuzz repo

Per the OSS-Fuzz docs at
[google.github.io/oss-fuzz/getting-started/new-project-guide](https://google.github.io/oss-fuzz/getting-started/new-project-guide/),
each project lives at `projects/<project-name>/` and contains:

```
projects/<project-name>/
  project.yaml      # metadata: language, fuzzing_engines, sanitizers, primary_contact
  Dockerfile        # builds the fuzz targets
  build.sh          # produces $OUT/<fuzz_target_1> + seed corpora
```

## project.yaml

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

## Dockerfile

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

## build.sh

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

## Local testing

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
