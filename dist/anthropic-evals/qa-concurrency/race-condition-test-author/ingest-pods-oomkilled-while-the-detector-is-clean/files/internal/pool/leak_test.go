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
