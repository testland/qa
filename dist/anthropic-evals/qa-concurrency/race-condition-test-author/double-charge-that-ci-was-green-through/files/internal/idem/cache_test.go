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
