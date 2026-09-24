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
