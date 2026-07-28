# libFuzzer: runtime flags and CI

Deep reference for `libfuzzer-cpp`. The core harness / build / run /
reproduce workflow lives in the skill spine; this file holds the full
runtime-flag table and the CI job.

## Common flags

Per [llvm.org/docs/LibFuzzer.html](https://llvm.org/docs/LibFuzzer.html):

| Flag | Effect |
|---|---|
| `-max_total_time=N` | Stop after N seconds |
| `-runs=N` | Stop after N executions (-1 = infinite) |
| `-dict=path` | Use dictionary file |
| `-seed=N` | Random seed |
| `-fork=N` | Run N parallel fork-mode workers |
| `-workers=N` | Number of parallel worker processes |
| `-jobs=N` | Total number of jobs to run across workers |
| `-merge=1` | Corpus minimisation mode |
| `-print_final_stats=1` | Print stats summary on exit |
| `-rss_limit_mb=N` | RSS memory limit (default 2048) |
| `-timeout=N` | Per-input timeout in seconds (default 1200) |
| `-only_ascii=1` | Restrict to ASCII bytes |

## CI integration

Short smoke fuzz on every PR:

```yaml
jobs:
  fuzz:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - name: Install clang
        run: sudo apt-get install -y clang lld
      - name: Build fuzz target
        run: |
          clang++ -g -O1 \
            -fsanitize=fuzzer,address,undefined \
            -fno-sanitize-recover=all \
            -fno-omit-frame-pointer \
            fuzz/fuzz_target.cc lib/parser.cc -o fuzz_target
      - uses: actions/cache@v4
        with:
          path: fuzz/corpus
          key: fuzz-corpus-${{ github.sha }}
          restore-keys: fuzz-corpus-
      - name: Smoke fuzz (5 min)
        run: ./fuzz_target -max_total_time=300 fuzz/corpus fuzz/seeds
      - name: Upload crashes
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: crashes
          path: |
            crash-*
            leak-*
            timeout-*
            oom-*
```
