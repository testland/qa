# Go - race detector workflow (GORACE, stress, goleak)

The Go race detector (ThreadSanitizer compiled into the binary via
`-race`) and goroutine leaks are two separate failure classes: the
detector finds concurrent unsynchronized access, goleak finds goroutines
that never stop. Run both.

## Enable the race detector

Per [go.dev/doc/articles/race_detector](https://go.dev/doc/articles/race_detector):

```bash
go test -race ./...
go run  -race main.go
go build -race ./cmd/server
```

Requires cgo and a C compiler on Linux/FreeBSD/Windows (mingw-w64 v8+ on
Windows; Darwin ships its own). Expected overhead per the same doc:
2-20x execution time, 5-10x memory, plus 8 bytes per `defer`/`recover`
accumulating until the goroutine exits - budget CI timeouts accordingly.

A detected race prints the conflicting read/write stacks and goroutine
creation sites to stderr (`WARNING: DATA RACE`); fix by protecting every
access to the address with the same primitive (mutex, atomic, or channel
hand-off).

## GORACE options

```bash
GORACE="log_path=/tmp/race/report halt_on_error=1 history_size=2" go test -race ./...
```

| Option | Default | When to change |
|---|---|---|
| `log_path` | `stderr` | File path so CI can archive race reports as artifacts |
| `halt_on_error` | `0` | `1` stops on the first race; local debugging |
| `history_size` | `1` | Raise to `2`-`7` when report stacks look truncated (memory cost) |
| `strip_path_prefix` | `""` | Make report lines repo-relative |
| `exitcode` | `66` | Override for CI exit-code conventions |

## Stress with -count and -cpu

The detector only fires on races that actually execute; a single run can
miss a real race. Amplify interleaving diversity:

```bash
go test -race -count=10 ./...          # 10 runs per package
go test -race -cpu=1,2,4,8 ./...       # re-run per GOMAXPROCS value
go test -race -count=5 -cpu=1,2,4 ./...
```

`GOMAXPROCS=1` surfaces sequencing bugs; higher values surface true
parallel races.

## go vet - loop-variable capture

Per [pkg.go.dev/cmd/vet](https://pkg.go.dev/cmd/vet) (`loopclosure`),
`go vet` flags goroutines closing over a range variable - the classic
pre-Go-1.22 capture race (`for _, v := range items { go func() { process(v) }() }`).
Run `go vet ./...` before `-race` to filter this class early; Go 1.22+
makes range variables per-iteration, but audit code that may build on
older toolchains.

## goleak - goroutine-leak detection

Per [github.com/uber-go/goleak](https://github.com/uber-go/goleak)
(`go get -u go.uber.org/goleak`):

```go
func TestWorkerPool(t *testing.T) {
    defer goleak.VerifyNone(t)     // fails if any goroutine outlives the test
    pool := NewWorkerPool(4)
    pool.Submit(func() { /* work */ })
    pool.Shutdown()
}
```

`VerifyNone` is incompatible with `t.Parallel()` - goleak cannot attribute
goroutines to parallel sub-tests. For parallel packages wrap the runner:

```go
func TestMain(m *testing.M) { goleak.VerifyTestMain(m) }
```

Silence expected library goroutines by top-of-stack function:

```go
goleak.VerifyNone(t, goleak.IgnoreTopFunction("database/sql.(*DB).connectionOpener"))
```

Full filter catalog (`IgnoreAnyFunction`, `IgnoreCurrent`, `Cleanup`) in
[goleak-filter-options.md](goleak-filter-options.md).

## CI matrix

Gate at least one matrix dimension with `-race` (per the race-detector
doc: "It is recommended to always run race-enabled tests"):

```yaml
jobs:
  test:
    strategy:
      matrix:
        go-version: ["1.22", "1.23"]
        race: ["", "-race"]
    steps:
      - uses: actions/setup-go@v5
        with: { go-version: "${{ matrix.go-version }}" }
      - env: { GORACE: "log_path=/tmp/race/report halt_on_error=0" }
        run: |
          go vet ./...
          go test ${{ matrix.race }} -count=3 -cpu=1,4 -timeout=10m ./...
      - if: failure()
        uses: actions/upload-artifact@v4
        with: { name: race-reports, path: /tmp/race/report* }
```

Set `-timeout` to 5-10x the non-race run time; upload `log_path` files on
failure.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Run `-race` once, see no output, ship | Detector only finds races that executed | `-count` / `-cpu` matrix |
| Skip `-race` for "release" builds in CI | Race appears in prod, not CI | Gate one matrix dimension with `-race` |
| `VerifyNone` with `t.Parallel()` | goleak can't attribute goroutines | `VerifyTestMain` |
| `IgnoreCurrent()` at package init | Snapshot masks leaks added before each test | Call inside each test function |
| Trust `-race` to catch goroutine leaks | Different failure class | Add goleak; the gates are complementary |
| `history_size=7` always | 128K history per goroutine can OOM CI | Start at `1`; raise only on truncated stacks |

## Limitations

- Cross-compiled binaries (`GOOS`/`GOARCH` differing from host) won't run
  `-race` unless the target toolchain supports TSan; `CGO_ENABLED=0`
  builds exclude it entirely.
- goleak supports only the two most recent Go minor versions.
- goleak has a brief internal retry, but slow-starting background
  goroutines can false-positive; use `IgnoreTopFunction`.

## References

- [go.dev/doc/articles/race_detector](https://go.dev/doc/articles/race_detector) -
  `-race`, GORACE, report format, overhead, platforms
- [github.com/uber-go/goleak](https://github.com/uber-go/goleak) - goleak API
- [pkg.go.dev/go.uber.org/goleak](https://pkg.go.dev/go.uber.org/goleak) - filter options
