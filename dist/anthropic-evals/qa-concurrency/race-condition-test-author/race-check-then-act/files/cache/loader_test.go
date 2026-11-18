package cache

import "testing"

func TestGetCachesValue(t *testing.T) {
	calls := 0
	c := New(func(k string) (string, error) { calls++; return "v", nil })
	c.Get("sku-1")
	c.Get("sku-1")
	if calls != 1 {
		t.Fatalf("calls = %d", calls)
	}
}
