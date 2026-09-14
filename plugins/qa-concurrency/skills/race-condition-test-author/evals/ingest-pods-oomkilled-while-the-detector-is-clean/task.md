# Ingest pods climb to 6GB over three days and nobody believes it is ours

## Problem Description

Our ingest pods get OOMKilled every 60-70 hours. RSS climbs in a straight line
from 480MB at rollout to the 6GB limit; there is no sawtooth and no spike, it
just goes up. A pprof goroutine profile pulled at 12h, 36h and 60h shows 4,100,
then 11,900, then 19,600 goroutines, and the top frames are all in
`internal/pool`. Restarting the pod resets it. We roll every Thursday, which is
why this took two months to notice.

Tobias, who owns the pool, says this cannot be a concurrency problem because we
run the detector on every pull request and it has never printed anything, and
that the growth is the JSON decoder holding onto buffers. He wants me to prove
otherwise before he will look at it.

There is already a test in the package that is supposed to catch exactly this.
It has been green since June.

Two things I need to be careful about. First, I am not allowed to touch
`internal/pool/pool.go` — Tobias owns it and he will fix it once I have shown
him something red. Second, the tests in this package take about 90 seconds if
they run one after another and about 12 if they do not, and the platform team
will not accept a 90-second package in the pull-request path. Every existing
test keeps running alongside the others, and keeps its name.

Give me something that fails on the current code, a pipeline that would keep
failing, and a written answer to Tobias I can paste into the ticket.

## Output Specification

1. Make the package's test run fail against `internal/pool` as it stands
   today, for the reason the pprof profiles point at.
2. `internal/pool/pool.go` must not be modified.
3. Every existing test keeps its name and keeps running concurrently with the
   others; the package must not go back to running serially.
4. Update `.github/workflows/ci.yml` so this stays caught.
5. Write `docs/leak-gate.md`: a direct answer to Tobias about what the
   detector we already run does and does not cover here, and what the new
   check adds.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/oom-ticket.md ===============
# ING-812 — ingest pods OOMKilled on a ~65h cycle

| | |
|---|---|
| Limit | 6GiB |
| RSS at rollout | ~480MB |
| Time to OOMKill | 60-70h, consistent across all 9 pods |
| Shape | Linear. No sawtooth, no step, no spike. |

## pprof goroutine counts, pod ingest-7c4

| Age | Goroutines | Top frames |
|---|---|---|
| 12h | 4,112 | `internal/pool.(*Pool).drainResults`, `internal/pool.(*Pool).reportDepth` |
| 36h | 11,908 | same two, same ratio |
| 60h | 19,644 | same two, same ratio |

Ratio is stable at 2 goroutines per `New` call. The service constructs a pool
per ingest batch and runs roughly 160 batches an hour.

## Notes from the thread

- @tbeck: "We run the detector on every PR against this package and it has
  never once printed anything. This is not a concurrency bug. Look at the JSON
  decoder — encoding/json holds a 64KB scratch buffer per decoder and we build
  a lot of decoders."
- Heap profile does not show growth in `encoding/json`. Inuse_space at 60h is
  310MB against 19,644 goroutines.
- `TestPoolDoesNotLeak` exists and is green.

=============== FILE: go.mod ===============
module github.com/northwind/ingest

go 1.23

require go.uber.org/goleak v1.3.0

=============== FILE: internal/pool/pool.go ===============
package pool

import (
	"database/sql"
	"sync"
	"time"
)

// Job is one unit of ingest work.
type Job func() error

// Pool runs jobs on a fixed set of workers and reports depth for metrics.
type Pool struct {
	jobs    chan Job
	results chan error
	db      *sql.DB
	wg      sync.WaitGroup
	depth   int
}

// New starts workers plus the depth reporter and the result drain.
func New(workers int, db *sql.DB) *Pool {
	p := &Pool{
		jobs:    make(chan Job, 64),
		results: make(chan error, 64),
		db:      db,
	}
	for i := 0; i < workers; i++ {
		p.wg.Add(1)
		go p.worker()
	}
	go p.reportDepth()
	go p.drainResults()
	return p
}

func (p *Pool) worker() {
	defer p.wg.Done()
	for job := range p.jobs {
		p.results <- job()
	}
}

func (p *Pool) reportDepth() {
	t := time.NewTicker(50 * time.Millisecond)
	for range t.C {
		p.depth = len(p.jobs)
	}
}

func (p *Pool) drainResults() {
	for err := range p.results {
		if err != nil {
			p.depth = 0
		}
	}
}

// Submit queues a job. Blocks when the queue is full.
func (p *Pool) Submit(j Job) { p.jobs <- j }

// Shutdown stops accepting work and waits for the workers to finish.
func (p *Pool) Shutdown() {
	close(p.jobs)
	p.wg.Wait()
}

=============== FILE: internal/pool/helpers_test.go ===============
package pool

import (
	"database/sql"
	"database/sql/driver"
)

type stubDriver struct{}
type stubConn struct{}

func (stubDriver) Open(string) (driver.Conn, error)  { return stubConn{}, nil }
func (stubConn) Prepare(string) (driver.Stmt, error) { return nil, driver.ErrSkip }
func (stubConn) Close() error                        { return nil }
func (stubConn) Begin() (driver.Tx, error)           { return nil, driver.ErrSkip }

func init() { sql.Register("stub", stubDriver{}) }

// One handle for the whole package, opened once and never closed - the real
// service holds its pool for the life of the process too.
var testDB = mustOpen()

func mustOpen() *sql.DB {
	db, err := sql.Open("stub", "")
	if err != nil {
		panic(err)
	}
	return db
}

=============== FILE: internal/pool/pool_test.go ===============
package pool

import (
	"errors"
	"sync/atomic"
	"testing"
)

func TestPoolRunsEveryJob(t *testing.T) {
	t.Parallel()

	p := New(4, testDB)
	var ran int64
	for i := 0; i < 16; i++ {
		p.Submit(func() error {
			atomic.AddInt64(&ran, 1)
			return nil
		})
	}
	p.Shutdown()

	if got := atomic.LoadInt64(&ran); got != 16 {
		t.Fatalf("ran %d jobs, want 16", got)
	}
}

func TestPoolSurvivesAFailingJob(t *testing.T) {
	t.Parallel()

	p := New(2, testDB)
	p.Submit(func() error { return errors.New("boom") })
	p.Submit(func() error { return nil })
	p.Shutdown()
}

func TestPoolAcceptsZeroJobs(t *testing.T) {
	t.Parallel()

	p := New(1, testDB)
	p.Shutdown()
}

=============== FILE: internal/pool/leak_test.go ===============
package pool

import (
	"testing"

	"go.uber.org/goleak"
)

// Snapshot of whatever is already running when this package loads.
var alreadyRunning = goleak.IgnoreCurrent()

func TestPoolDoesNotLeak(t *testing.T) {
	t.Parallel()

	defer goleak.VerifyNone(t,
		alreadyRunning,
		// long-lived by design; added 2026-06-02 to stop this test flaking -- @tbeck
		goleak.IgnoreTopFunction("github.com/northwind/ingest/internal/pool.(*Pool).reportDepth"),
		goleak.IgnoreTopFunction("github.com/northwind/ingest/internal/pool.(*Pool).drainResults"),
	)

	p := New(4, testDB)
	p.Submit(func() error { return nil })
	p.Shutdown()
}

=============== FILE: .github/workflows/ci.yml ===============
name: ci

on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: "1.23"

      - name: Vet
        run: go vet ./...

      - name: Tests
        run: go test ./... -timeout=5m

      - name: Detector
        run: go test -race ./... -timeout=15m
