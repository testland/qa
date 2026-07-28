---
name: go-race-detector-workflow
description: "Runs the Go race detector and goroutine-leak checker end-to-end: instrument with `go test -race`, read race reports, configure GORACE options, stress with `-count`/`-cpu`, detect goroutine leaks with go.uber.org/goleak, and gate both checks in CI. Use when a Go service has shared state accessed by concurrent goroutines, when a race-related incident needs a regression harness, or when adding `-race` to a CI matrix for a Go module. Does not cover barrier-based deterministic interleaving or forced goroutine scheduling; use race-condition-test-author for that."
metadata:
  keywords: "go, race-detector, goroutine-leak, goleak, concurrency, data-race, GOMAXPROCS"
---

# go-race-detector-workflow

The race detector (compiled into the binary via ThreadSanitizer) and
goroutine leaks are two separate failure classes: the detector finds
concurrent unsynchronized access, not leaked goroutines. This skill walks
both checks, from first run to CI gate.

`race-condition-test-author` covers multi-language deterministic interleaving
(barriers, jcstress, TSan for C/C++). This skill focuses exclusively on Go:
the `-race` flag, GORACE tuning, stress amplification, and goleak.

## Step 1 - Enable the race detector

Per [go.dev/doc/articles/race_detector], add `-race` to any `go` command:

```bash
go test -race ./...
go run  -race main.go
go build -race ./cmd/server
```

The flag compiles ThreadSanitizer instrumentation into the binary. It
requires cgo and a C compiler (on Linux/FreeBSD/Windows; Darwin ships
its own). Supported platforms as of Go 1.22: `linux/amd64`,
`linux/arm64`, `linux/ppc64le`, `linux/s390x`, `linux/loong64`,
`freebsd/amd64`, `netbsd/amd64`, `darwin/amd64`, `darwin/arm64`,
`windows/amd64` (mingw-w64 runtime v8+ required).

Per [go.dev/doc/articles/race_detector], expected overhead:
- Execution time: 2-20x slower.
- Memory: 5-10x increase.
- Additional 8 bytes per `defer`/`recover`, accumulating until the goroutine
  exits (not until the deferred function returns) - unbounded in long-running
  service binaries, so budget CI timeouts accordingly.

## Step 2 - Read a race report

A detected race prints two goroutine stacks to stderr:

```
WARNING: DATA RACE
Write at 0x00c0000b4010 by goroutine 7:
  main.(*Cache).set+0x6c
    /home/user/app/cache.go:38

Previous read at 0x00c0000b4010 by goroutine 6:
  main.(*Cache).get+0x44
    /home/user/app/cache.go:22

Goroutine 7 (running) created at:
  main.runWorker+0x34
    /home/user/app/main.go:71
```

The report names the conflicting accesses (read vs. write), the memory
address, and the goroutine creation sites. Fix by protecting all accesses
to the address with the same synchronization primitive (mutex, atomic, or
channel hand-off).

## Step 3 - Tune GORACE options

Per [go.dev/doc/articles/race_detector], set `GORACE` before the command:

```bash
GORACE="log_path=/tmp/race/report halt_on_error=1 history_size=2" \
  go test -race ./...
```

Useful options:

| Option | Default | When to change |
|---|---|---|
| `log_path` | `stderr` | Set to a file path so CI can archive race reports as artifacts |
| `halt_on_error` | `0` | Set to `1` to stop immediately on first race; useful for local debugging |
| `history_size` | `1` | Increase to `2`-`7` when report stacks look truncated (trades memory for depth) |
| `strip_path_prefix` | `""` | Strip module root from paths so report lines are repo-relative |
| `exitcode` | `66` | Override if your CI treats specific exit codes differently |

## Step 4 - Stress with `-count` and `-cpu`

The race detector only fires on races that actually execute. A single
`go test -race` run on a lightly-contended path may produce zero output
and still miss a real race. Amplify coverage:

```bash
# Run each test 10 times per package
go test -race -count=10 ./...

# Exercise multiple GOMAXPROCS values
go test -race -cpu=1,2,4,8 ./...

# Combine: 5 runs at each GOMAXPROCS
go test -race -count=5 -cpu=1,2,4 ./...
```

`-cpu` sets `GOMAXPROCS` for each comma-separated value, then re-runs.
Running at `GOMAXPROCS=1` surfaces sequencing bugs; higher values surface
true parallel races. Combining both increases scheduler interleaving
diversity without extra code.

## Step 5 - Check loop-variable capture with `go vet`

Per the [Go vet documentation at go.dev/cmd/vet](https://pkg.go.dev/cmd/vet)
(`loopclosure`: "check references to loop variables from within nested
functions"), `go vet` flags the
classic loop-variable-capture anti-pattern that frequently causes races
when goroutines close over a range variable:

```go
// Before Go 1.22 - race: all goroutines capture the same &v
for _, v := range items {
    go func() { process(v) }()  // vet warns here
}

// Fix: copy the variable
for _, v := range items {
    v := v
    go func() { process(v) }()
}
```

Run before `-race` to filter out this class early:

```bash
go vet ./...
go test -race ./...
```

In Go 1.22+, range variables are per-iteration by default; the capture
pattern is still worth auditing in code that may be compiled with
older toolchains.

## Step 6 - Detect goroutine leaks with goleak

A goroutine that starts but never stops is a leak: the race detector
ignores it (no concurrent access violation), but the goroutine holds
resources and inflates memory over time.

Install per [github.com/uber-go/goleak]:

```bash
go get -u go.uber.org/goleak
```

### Per-test: `VerifyNone`

```go
import "go.uber.org/goleak"

func TestWorkerPool(t *testing.T) {
    defer goleak.VerifyNone(t)

    pool := NewWorkerPool(4)
    pool.Submit(func() { /* work */ })
    pool.Shutdown()
    // VerifyNone fires after Shutdown() returns;
    // any still-running worker goroutine fails the test.
}
```

Per [github.com/uber-go/goleak], `VerifyNone` is incompatible with
`t.Parallel()`: goleak cannot associate a specific goroutine with a
specific parallel sub-test.

### Package-level: `VerifyTestMain`

For packages that use `t.Parallel()`, wrap the test runner instead:

```go
func TestMain(m *testing.M) {
    goleak.VerifyTestMain(m)
}
```

`VerifyTestMain` runs the full test binary, then checks for leaked
goroutines once all tests have completed.

### Filtering expected goroutines

Third-party libraries sometimes leave intentional background goroutines.
Silence a known one by its top-of-stack function:

```go
goleak.VerifyNone(t,
    goleak.IgnoreTopFunction("database/sql.(*DB).connectionOpener"),
)
```

Full filter-option catalog (`IgnoreAnyFunction`, `IgnoreCurrent`, `Cleanup`,
and when to prefer each) is in
[references/goleak-filter-options.md](references/goleak-filter-options.md).

## Step 7 - CI matrix

Gate both checks in CI. Run `-race` in at least one matrix dimension
(per [go.dev/doc/articles/race_detector]: "It is recommended to always run
race-enabled tests"):

```yaml
jobs:
  test:
    strategy:
      matrix:
        go-version: ["1.22", "1.23"]
        race: ["", "-race"]
    steps:
      - uses: actions/setup-go@v5
        with:
          go-version: ${{ matrix.go-version }}

      - name: Run tests
        env:
          GORACE: "log_path=/tmp/race/report halt_on_error=0"
        run: |
          go vet ./...
          go test ${{ matrix.race }} -count=3 -cpu=1,4 -timeout=10m ./...

      - name: Upload race reports
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: race-reports-${{ matrix.go-version }}-${{ matrix.race }}
          path: /tmp/race/report*
```

Because `-race` adds the Step 1 execution overhead, set `-timeout` to at
least 5-10x your non-race run time. Upload `log_path` files on failure so
the report survives the run.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Run `-race` once, see no output, ship | Race detector only finds races that execute in that run | Use `-count`/`-cpu` matrix (Step 4) |
| Skip `-race` in CI for "release" builds | Race that appears in production, not in CI | Gate at least one matrix dimension with `-race` (Step 7) |
| Use `defer goleak.VerifyNone(t)` with `t.Parallel()` | goleak cannot associate goroutines to parallel sub-tests | Use `VerifyTestMain` instead (Step 6) |
| `IgnoreCurrent()` at test-file scope | Snapshot is taken once at import time; masks leaks added before each test | Call `IgnoreCurrent()` inside each test function, not at package init |
| Trust `-race` to catch goroutine leaks | `-race` detects concurrent unsynchronized access, not leaked goroutines | Add goleak (Step 6); both gates are complementary |
| Set `history_size` to max (7) always | 128K access history per goroutine multiplies memory cost; can OOM CI runners | Start at `1`; raise only when reports show truncated stacks |

## Limitations

- The race detector only fires on races that execute in the instrumented
  run. Low-probability interleavings require stress (`-count`, `-cpu`) or
  barrier-based deterministic tests (see `race-condition-test-author`).
- The cgo requirement (Step 1) means cross-compiled binaries (e.g.,
  `GOOS=linux GOARCH=arm` on a Mac) will not run with `-race` unless the
  target toolchain supports TSan.
- Per [github.com/uber-go/goleak], goleak requires one of the two most
  recent minor versions of Go; older toolchains are not supported.
- goleak does not distinguish between a goroutine that will stop shortly
  and one that is genuinely leaked. `VerifyNone` has a brief internal
  retry loop, but tests that start background goroutines with long startup
  delays can produce false positives; use `IgnoreTopFunction` to suppress
  known cases.

## References

- [go.dev/doc/articles/race_detector] - canonical reference for `-race`,
  GORACE options, report format, overhead, and platform support
- [github.com/uber-go/goleak] - goleak source, `VerifyNone`,
  `VerifyTestMain`, and filter option docs
- [pkg.go.dev/go.uber.org/goleak] - full API reference for
  `IgnoreTopFunction`, `IgnoreAnyFunction`, `IgnoreCurrent`, `Cleanup`
- `race-condition-test-author` -
  multi-language deterministic interleaving (barriers, jcstress, TSan for
  C/C++); this skill is the Go-specific complement
- `deadlock-detection-harness` -
  deadlock patterns; separate from data races

[go.dev/doc/articles/race_detector]: https://go.dev/doc/articles/race_detector
[github.com/uber-go/goleak]: https://github.com/uber-go/goleak
[pkg.go.dev/go.uber.org/goleak]: https://pkg.go.dev/go.uber.org/goleak
