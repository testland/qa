---
name: ceedling-build-runner
description: "Author and run the Ceedling build system for C unit testing - the canonical build orchestration on top of Unity (assertions) + CMock (mocks) + CException (exceptions). Covers ceedling new project scaffolding, the project.yml schema (:project / :paths / :files / :defines / :flags / :tools / :test_runner / :cmock / :unity / :cexception / :gcov / :plugins), the task surface (ceedling test:all, ceedling test:<name>, ceedling test:pattern, ceedling test:path, ceedling release, ceedling clean / clobber, ceedling gcov:all, ceedling module:create, ceedling environment, ceedling dumpconfig), JUnit XML output via the report_tests_pretty_stdout / report_tests_junit_xml plugins, gcov plugin integration, host vs cross-build flow, and CI wiring. Use when a C project wants the standard ThrowTheSwitch trio bundled by one build command. For the Unity assertion API see unity-test-framework-c; for CMock semantics see ceedling-mocks-reference."
rating: 24
d6: 4
keywords: ["ceedling", "unity", "cmock", "cexception", "c", "embedded", "rake", "throwtheswitch"]
---

# ceedling-build-runner

## Overview

Ceedling is, per the README at
[github.com/ThrowTheSwitch/Ceedling](https://github.com/ThrowTheSwitch/Ceedling),
"a handy-dandy build system for C projects" that combines three
open-source frameworks: **Unity** (xUnit-style assertions),
**CMock** (function mocking via code generation), and
**CException** (exception handling for C). Per
[throwtheswitch.org/ceedling](https://www.throwtheswitch.org/ceedling)
it "starts with the Unity test framework and CMock mock and stub
generation, then adds a build system for coordinating, executing,
and summarizing test and release builds".

This skill wraps the Ceedling build orchestration - the
`ceedling` command-line tool, `project.yml` schema, and rake
tasks. For the Unity assertion API see
[`unity-test-framework-c`](../unity-test-framework-c/SKILL.md);
for CMock's generated mock API see
[`ceedling-mocks-reference`](../ceedling-mocks-reference/SKILL.md);
for cross-target run see
[`qemu-system-test-runner`](../qemu-system-test-runner/SKILL.md);
for coverage see
[`embedded-coverage-strategy-reference`](../embedded-coverage-strategy-reference/SKILL.md).

## When to use

- C unit-test project - Ceedling is the canonical setup for the
  ThrowTheSwitch stack.
- Host-build-driven test loop (most embedded teams test on the
  host first, then cross-compile under
  [`qemu-system-test-runner`](../qemu-system-test-runner/SKILL.md)) - Ceedling handles the host pipeline natively.
- Coverage required - the bundled gcov plugin produces LCOV /
  HTML / Cobertura without external glue.
- Mock-heavy module - CMock is integrated; no separate generator
  invocation needed.

If the unit-under-test is C++ instead of C, prefer
[`googletest-embedded-arm`](../googletest-embedded-arm/SKILL.md);
Ceedling does not target C++.

## Authoring

### Scaffolding a new project

Per the Ceedling README and the command-line reference at
[github.com/ThrowTheSwitch/Ceedling/.../getting-started/command-line.md](https://github.com/ThrowTheSwitch/Ceedling/blob/master/docs/mkdocs/getting-started/command-line.md):

```bash
gem install ceedling
ceedling new my-firmware --docs --local
cd my-firmware
```

`--docs` includes the documentation locally; `--local` vendors
Unity / CMock / CException into `vendor/ceedling/` so the build
doesn't need network at compile time. The generated layout:

```
my-firmware/
  project.yml          # the schema covered below
  src/                 # production code under test
  test/                # one test_<module>.c per module
  test/support/        # shared test helpers
  build/               # generated; gitignore'd
  vendor/ceedling/     # bundled Unity + CMock + CException
```

### project.yml schema

Per `CeedlingPacket.md`, the canonical top-level sections:

```yaml
:project:
  :build_root: build/
  :release_build: TRUE
  :use_mocks: TRUE
  :use_exceptions: TRUE
  :use_test_preprocessor: :all
  :test_file_prefix: test_

:paths:
  :test:
    - test/**
  :source:
    - src/**
  :include:
    - inc/**
  :support: []
  :libraries: []

:files:
  # .c, .h, .o extension mappings — usually default values

:defines:
  :test:
    - UNITY_INCLUDE_DOUBLE
  :release:
    - NDEBUG

:flags:
  :release:
    :compile:
      '*':
        - -O2
        - -Wall
    :link:
      '*':
        - -Wl,--gc-sections
  :test:
    :compile:
      '*':
        - -O0
        - -g
        - --coverage
    :link:
      '*':
        - --coverage

:tools:
  # Override compiler / linker / preprocessor executables here

:test_runner:
  :includes:
    - "Mock*.h"

:unity:
  :defines:
    - UNITY_INCLUDE_DOUBLE

:cmock:
  :when_no_prototypes: :warn
  :enforce_strict_ordering: TRUE
  :plugins:
    - :ignore
    - :ignore_arg
    - :expect_any_args
    - :array
    - :callback
    - :return_thru_ptr

:cexception:
  :defines:
    - CEXCEPTION_T='signed char'

:gcov:
  :reports:
    - HtmlDetailed
    - Cobertura
  :gcovr:
    :report_root: src/

:plugins:
  :enabled:
    - report_tests_pretty_stdout
    - report_tests_junit_xml
    - gcov
    - module_generator
```

| Section | Purpose |
|---|---|
| `:project` | Global on/off switches: `:use_mocks`, `:use_exceptions`, `:test_file_prefix`, `:build_root` |
| `:paths` | Where Ceedling looks for code; supports glob patterns |
| `:files` | `.c` / `.h` / `.o` extension mapping (rarely changed) |
| `:defines` | Test-only vs release-only `-D` symbols (e.g. `UNITY_INCLUDE_DOUBLE` is a test-only define) |
| `:flags` | Test vs release compile / link flags, by file glob (`'*'` = all) |
| `:tools` | Override toolchain binaries - set the compiler to `arm-none-eabi-gcc` here for a cross-build |
| `:test_runner` | Controls the `generate_test_runner.rb` invocation; e.g. extra includes |
| `:unity` | Unity build-time defines (e.g. `UNITY_INT_WIDTH=16` for 16-bit MCUs) |
| `:cmock` | CMock plugin list (see [`ceedling-mocks-reference`](../ceedling-mocks-reference/SKILL.md)) |
| `:cexception` | CException type override (default `int`; some MCUs prefer `signed char`) |
| `:gcov` | Coverage reports - `HtmlDetailed`, `Cobertura`, `SonarQube` formats per the plugin docs |
| `:plugins` | Enable optional functionality; common ones below |

### Common plugins

| Plugin | Effect |
|---|---|
| `report_tests_pretty_stdout` | Coloured terminal report |
| `report_tests_junit_xml` | JUnit XML at `build/artifacts/test/report.xml` - feeds CI dashboards |
| `report_tests_log_factory` | Generic reporter - emit multiple formats at once |
| `gcov` | Coverage via gcov + gcovr (see coverage skill) |
| `module_generator` | Powers `ceedling module:create[<name>]` |
| `command_hooks` | Run shell commands at pre/post lifecycle points |

### Creating a module

```bash
ceedling module:create[ringbuffer]
# Creates src/ringbuffer.c, src/ringbuffer.h, test/test_ringbuffer.c
```

The generator emits the canonical skeleton - production header /
source with includes wired, test file with `setUp` / `tearDown` /
one `test_ringbuffer_NeedToImplement` placeholder.

## Running

Per the CeedlingPacket task reference:

### Core test tasks

```bash
ceedling test:all                          # Run every test_*.c
ceedling test:ringbuffer                   # Run only test_ringbuffer.c
ceedling test:pattern[ringbuffer]          # Regex match on test file basename
ceedling test:path[test/components]        # Tests under a path
ceedling test:ringbuffer --test-case=push  # Run only test cases matching 'push'
```

`--test-case=<pattern>` is the equivalent of `--gtest_filter`
from GoogleTest.

### Release build

```bash
ceedling release                # Build production binary
ceedling release:compile:foo.c  # Compile a single file
```

`release` is opt-in (`:project: :release_build: TRUE` in
project.yml). Use it for the actual firmware build, not for
tests.

### Maintenance

```bash
ceedling clean        # Remove .o files
ceedling clobber      # Remove all generated files (build/, generated runners, mocks)
ceedling environment  # Print environment (CC, PATH, etc.)
ceedling dumpconfig   # Print the merged project.yml
ceedling help         # Task list
ceedling version      # Ceedling version
```

`dumpconfig` is invaluable for debugging mysterious flag
behaviour - Ceedling merges several layers (defaults, project,
plugin) and the final flags can surprise.

### Coverage

```bash
ceedling gcov:all
# Runs every test under gcov instrumentation, generates report
# at build/artifacts/gcov/GcovCoverageResults.html (HtmlDetailed)
# or build/artifacts/gcov/GcovCoverageCobertura.xml (Cobertura)
```

See [`embedded-coverage-strategy-reference`](../embedded-coverage-strategy-reference/SKILL.md)
for the gcov toolchain details and the report-format trade-offs.

### Compound tasks

Per the CeedlingPacket task ref: "Tasks chain via command line".

```bash
ceedling clobber test:all release gcov:all
# Clean → run tests → build release → produce coverage report
```

This is the canonical CI invocation.

## Parsing results

### Pretty stdout output

```
-------------------
OVERALL TEST SUMMARY
-------------------
TESTED:  47
PASSED:  46
FAILED:   1
IGNORED:  0
```

Failures are reported per assertion with file:line:test:reason:

```
test/test_ringbuffer.c:48:test_overflow_returns_minus_one:FAIL: Expected -1 Was 0
```

### JUnit XML

With `report_tests_junit_xml` enabled, `ceedling test:all` writes
`build/artifacts/test/report.xml` in the canonical JUnit schema - 
the same one GoogleTest produces, so the same CI pipeline plugin
(GitHub `mikepenz/action-junit-report`, GitLab JUnit, Jenkins
JUnit) consumes both.

### Exit code

`ceedling test:all` returns non-zero on any test failure. CI
steps gate on the exit code.

### Coverage report

The gcov plugin's HtmlDetailed report goes to
`build/artifacts/gcov/GcovCoverageResults.html`; Cobertura XML
goes to `GcovCoverageCobertura.xml` (consumed by Jenkins coverage
plugin and SonarQube).

## CI integration

```yaml
jobs:
  ceedling-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - name: Setup Ruby + Ceedling
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.2'
      - run: gem install ceedling
      - name: Run tests + coverage
        run: ceedling clobber test:all gcov:all
      - name: Publish JUnit
        if: always()
        uses: mikepenz/action-junit-report@v4
        with:
          report_paths: 'build/artifacts/test/*.xml'
      - name: Publish coverage
        uses: codecov/codecov-action@v5
        with:
          files: build/artifacts/gcov/GcovCoverageCobertura.xml
```

For a cross-compile path (host build for CI, ARM build for
hardware-in-loop) the recipe is: keep two `project.yml` files
(`project.yml` for host, `project-arm.yml` for ARM) and pass
`--project=project-arm.yml` for the ARM build. The ARM build's
`:tools:` overrides the compiler to `arm-none-eabi-gcc` and the
results route through `qemu-system-test-runner`.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Editing the generated `*_Runner.c` files | Regenerated on every build; edits lost | Edit the source `test_*.c`; the runner is derived |
| `:enforce_strict_ordering: FALSE` to "make tests pass" | Mock-call-order bugs become invisible | Keep `:enforce_strict_ordering: TRUE`; fix the SUT's call shape |
| Commit `build/` artifacts | Repo bloat; merges conflict on generated files | `.gitignore build/` always |
| Skipping `ceedling clobber` in CI | Stale mocks survive header changes; ghost test failures | Always `clobber` before the CI run |
| Mixing test compile flags with release flags | `--coverage` in release build inflates the binary | Keep `:flags: :test:` separate from `:flags: :release:` |
| Naming a test file `_test.c` instead of `test_*.c` | Default `:test_file_prefix: test_` won't pick it up | Match the prefix or change the project.yml setting |
| Using `:use_mocks: FALSE` then including a `Mock*.h` | CMock isn't invoked; link fails on the mock symbol | Either enable mocks globally or use Ceedling's `--mocks` runtime flag |
| Hardcoding the build directory in scripts | `:build_root` is project.yml-driven; scripts break on rename | Read it from `ceedling environment` |

## Limitations

- **Ruby dependency.** Ceedling runs on Ruby; embedded teams
  without a Ruby toolchain have an adoption cost.
- **C only.** No C++ support - for C++ pair
  [`googletest-embedded-arm`](../googletest-embedded-arm/SKILL.md)
  with CMake.
- **Per-file flag overrides are verbose.** The `:flags` schema's
  glob keys are powerful but error-prone - `dumpconfig` is the
  only reliable verifier.
- **No native parallel test execution.** Each `test_*` runs
  serially. Parallelise across multiple `test:path[...]` jobs in
  CI if needed.
- **Plugin discovery is path-sensitive.** Custom plugins must
  live under `:plugins: :load_paths:` in project.yml. Ceedling's
  error messages on missing plugins are terse.
- **gcov plugin reports are coupled to host-built coverage.**
  For on-target coverage, write a custom plugin or feed gcovr
  manually after a QEMU run.

## References

Cited inline. Foundational documents:

- Ceedling repository - [github.com/ThrowTheSwitch/Ceedling](https://github.com/ThrowTheSwitch/Ceedling).
- Ceedling overview - [www.throwtheswitch.org/ceedling](https://www.throwtheswitch.org/ceedling).
- Ceedling docs (project.yml + task reference) - [throwtheswitch.github.io/Ceedling/latest](https://throwtheswitch.github.io/Ceedling/latest/).
- Sibling skills:
  [`unity-test-framework-c`](../unity-test-framework-c/SKILL.md),
  [`ceedling-mocks-reference`](../ceedling-mocks-reference/SKILL.md),
  [`embedded-coverage-strategy-reference`](../embedded-coverage-strategy-reference/SKILL.md),
  [`qemu-system-test-runner`](../qemu-system-test-runner/SKILL.md),
  [`googletest-embedded-arm`](../googletest-embedded-arm/SKILL.md).
