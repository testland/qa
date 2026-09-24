//go:build !race

// Kept out of the instrumented build: this one was adding 40s to every
// instrumented run and in a year it has never found anything. -- @dmoreau 2025-09

package idem

import (
	"sync"
	"testing"
	"time"
)

func checkCharge(t *testing.T, r *Result, err error) {
	if err != nil {
		t.Fatalf("Do: %v", err)
	}
	if r.Amount != 999 {
		t.Fatalf("amount = %d, want 999", r.Amount)
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
			checkCharge(t, r, err)
		}(i)
	}

	wg.Wait()
}
