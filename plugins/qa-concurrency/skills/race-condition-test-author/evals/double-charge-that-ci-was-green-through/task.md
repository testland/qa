# 412 customers charged twice and the build was green the whole time

## Problem Description

INC-4471 is on me and I need the CI half of it closed today.

On 29 August a gateway timeout caused the mobile client to retry submits. For
forty minutes we charged 412 customers twice — 418 duplicate charges, $37k
refunded. Every duplicate pair carries the same idempotency key, the two
charges land between 0 and 90ms apart, and both come from the same replica, so
this is not our distributed lock. It is `internal/idem`, which is the only
thing standing between a retry and a second call to the gateway.

The part that is embarrassing is that this package has been green on every
commit for fourteen months, including the commit that introduced it. There is
a test in there that spins up eight goroutines against the same key and it has
never once complained. Somebody also added a detector step to the workflow
about a year ago.

The payments team is fixing `cache.go` in their own PR this week. I do not want
to touch their file and I do not want to be in a merge fight with them. What I
owe the incident review is the gate: a test that goes red against the code as
it stands today, and a pipeline that would have gone red in August.

Please do not hand me a test that only fails on an unlucky afternoon. If it
needs a specific interleaving to go red, make the test produce that
interleaving itself.

## Output Specification

1. Add a Go test under `internal/idem/` that fails against the current
   implementation, and that fails for a reason the test arranges rather than
   because a particular machine happened to schedule things that way.
2. `internal/idem/cache.go` must not change. The fix ships in a separate PR
   from the payments team; this ticket delivers the gate, not the fix.
3. Repair anything in `internal/idem/cache_test.go` that is stopping a real
   failure from being reported. Keep the existing test names.
4. Change `.github/workflows/ci.yml` so a defect of this shape would have
   turned the build red in August, and so whoever picks up the failure can
   read the detector's output after the run has finished.
5. Write `docs/ci-race-gate.md` covering what you changed in CI, what it now
   costs in wall-clock time, and what it still will not catch.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/incident-2026-08-29.md ===============
# INC-4471 — duplicate charges, 2026-08-29

| | |
|---|---|
| Window | 14:02–14:41 UTC |
| Affected | 412 customers, 418 duplicate charges |
| Value | $37,104 refunded |
| Trigger | Gateway 504s at 14:01; mobile client retried each submit up to 4x with 2s backoff |

## Timeline

- 14:01 — payment gateway returns 504 for ~90 seconds.
- 14:02 — duplicate `ch_` ids begin appearing against a single idempotency key.
- 14:41 — traffic drains, duplicates stop.

## What we know

- Every duplicate pair shares one idempotency key. Gap between the two charges
  ranged 0–90ms, median 11ms.
- `internal/idem` is the only place the key is checked before the gateway call.
- 12 replicas run in production. Every duplicate pair came from the **same**
  replica, so the distributed lock in `internal/lease` is not implicated. This
  is in-process.
- CI has been green on `internal/idem` on every commit for 14 months, including
  the commit that shipped `Do`.

## Open for this ticket

Why did CI never see it, and what has to change so the next one is caught
before it ships.

=============== FILE: go.mod ===============
module github.com/northwind/payments

go 1.23

=============== FILE: internal/idem/cache.go ===============
package idem

import "time"

// Result is what the gateway gave us back for one charge attempt.
type Result struct {
	ChargeID string
	Amount   int64
}

// Cache remembers charge results by idempotency key for the life of the process.
type Cache struct {
	entries map[string]*Result
	ttl     time.Duration
}

func New(ttl time.Duration) *Cache {
	return &Cache{entries: make(map[string]*Result), ttl: ttl}
}

// Do returns the remembered result for key, calling charge only on a miss.
func (c *Cache) Do(key string, charge func() (*Result, error)) (*Result, error) {
	if r, ok := c.entries[key]; ok {
		return r, nil
	}
	r, err := charge()
	if err != nil {
		return nil, err
	}
	c.entries[key] = r
	return r, nil
}

=============== FILE: internal/idem/cache_test.go ===============
package idem

import (
	"sync"
	"testing"
	"time"
)

func TestDoChargesOnceForRepeatedKey(t *testing.T) {
	c := New(time.Minute)
	calls := 0
	charge := func() (*Result, error) {
		calls++
		return &Result{ChargeID: "ch_1", Amount: 4200}, nil
	}

	first, _ := c.Do("key-a", charge)
	second, _ := c.Do("key-a", charge)

	if calls != 1 {
		t.Fatalf("charge called %d times, want 1", calls)
	}
	if first.ChargeID != second.ChargeID {
		t.Fatalf("got %q and %q, want the same charge", first.ChargeID, second.ChargeID)
	}
}

func TestDoUnderLoad(t *testing.T) {
	c := New(time.Minute)
	var wg sync.WaitGroup

	for i := 0; i < 8; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			time.Sleep(time.Duration(i) * time.Millisecond)
			r, err := c.Do("key-b", func() (*Result, error) {
				return &Result{ChargeID: "ch_2", Amount: 999}, nil
			})
			if err != nil {
				t.Fatalf("Do: %v", err)
			}
			if r.Amount != 999 {
				t.Fatalf("amount = %d, want 999", r.Amount)
			}
		}(i)
	}

	wg.Wait()
}

=============== FILE: .github/workflows/ci.yml ===============
name: ci

on:
  push:
    branches: [main]
  pull_request:

env:
  CGO_ENABLED: "0"
  GOFLAGS: "-trimpath"

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        go-version: ["1.22", "1.23"]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: "${{ matrix.go-version }}"

      - name: Vet
        run: go vet ./...

      - name: Unit tests
        run: go test ./... -timeout=2m

      # Added after INC-3102 (2025-09). Was failing the job on merge day so it
      # is non-blocking until someone has time to look at it. -- @dmoreau
      - name: Detector
        continue-on-error: true
        run: go test -race ./... -timeout=2m

      - name: Build release binary
        run: go build -o bin/payments ./cmd/payments
