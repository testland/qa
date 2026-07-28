# Ceedling task reference

Per the CeedlingPacket task reference. The SKILL spine keeps `ceedling test:all`, `ceedling gcov:all`, and the compound CI invocation; the full surface follows.

## Test tasks

```bash
ceedling test:all                          # Run every test_*.c
ceedling test:ringbuffer                   # Run only test_ringbuffer.c
ceedling test:pattern[ringbuffer]          # Regex match on test file basename
ceedling test:path[test/components]        # Tests under a path
ceedling test:ringbuffer --test-case=push  # Run only test cases matching 'push'
```

`--test-case=<pattern>` is the equivalent of GoogleTest's `--gtest_filter`.

## Release build

```bash
ceedling release                # Build production binary
ceedling release:compile:foo.c  # Compile a single file
```

`release` is opt-in (`:project: :release_build: TRUE` in project.yml). Use it for the actual firmware build, not for tests.

## Maintenance

```bash
ceedling clean        # Remove .o files
ceedling clobber      # Remove all generated files (build/, generated runners, mocks)
ceedling environment  # Print environment (CC, PATH, etc.)
ceedling dumpconfig   # Print the merged project.yml
ceedling help         # Task list
ceedling version      # Ceedling version
```

`dumpconfig` is the reliable way to debug mysterious flag behaviour - Ceedling merges several layers (defaults, project, plugin) and the final flags can surprise.

## Compound tasks

Tasks chain on the command line:

```bash
ceedling clobber test:all release gcov:all
# Clean -> run tests -> build release -> produce coverage report
```

This is the canonical CI invocation.
