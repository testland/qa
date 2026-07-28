# Ceedling project.yml schema

Per `CeedlingPacket.md`, the canonical top-level sections. Copy-paste template:

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
  # .c, .h, .o extension mappings - usually default values

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

## Section notes

- `:project` holds the global on/off switches: `:use_mocks`, `:use_exceptions`, `:test_file_prefix`, `:build_root`.
- `:paths` supports glob patterns; `'*'` under `:flags` matches all files.
- `:defines` splits test-only vs release-only `-D` symbols (`UNITY_INCLUDE_DOUBLE` is a test-only define).
- `:tools` is where a cross-build overrides the compiler to `arm-none-eabi-gcc`.
- `:unity` sets Unity build-time defines, e.g. `UNITY_INT_WIDTH=16` for 16-bit MCUs.
- `:cmock` plugin list - see `cmock-reference`.
- `:cexception` type override; default is `int`, some MCUs prefer `signed char`.
- `:gcov` report formats: `HtmlDetailed`, `Cobertura`, `SonarQube`.

## Plugins

| Plugin | Effect |
|---|---|
| `report_tests_pretty_stdout` | Coloured terminal report |
| `report_tests_junit_xml` | JUnit XML at `build/artifacts/test/report.xml` - feeds CI dashboards |
| `report_tests_log_factory` | Generic reporter - emit multiple formats at once |
| `gcov` | Coverage via gcov + gcovr (see `embedded-coverage-strategy-reference`) |
| `module_generator` | Powers `ceedling module:create[<name>]` |
| `command_hooks` | Run shell commands at pre/post lifecycle points |
