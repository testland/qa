package idem

import (
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

func TestDoReturnsGatewayError(t *testing.T) {
	c := New(time.Minute)
	_, err := c.Do("key-err", func() (*Result, error) {
		return nil, errBoom
	})
	if err == nil {
		t.Fatal("want the gateway error back")
	}
}
