# The cache calls the slow loader once per request on a cold key

## Problem Description

Write a regression test that reproduces `incident.md` and fails on the current `cache/loader.go`, then fix the cache.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: cache/loader.go ===============
package cache

import "sync"

type Loader func(key string) (string, error)

type Cache struct {
	mu    sync.RWMutex
	items map[string]string
	load  Loader
}

func New(load Loader) *Cache { return &Cache{items: map[string]string{}, load: load} }

func (c *Cache) Get(key string) (string, error) {
	c.mu.RLock()
	v, ok := c.items[key]
	c.mu.RUnlock()
	if ok {
		return v, nil
	}
	v, err := c.load(key) // slow: calls the pricing service
	if err != nil {
		return "", err
	}
	c.mu.Lock()
	c.items[key] = v
	c.mu.Unlock()
	return v, nil
}

=============== FILE: cache/loader_test.go ===============
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

=============== FILE: incident.md ===============
During the 09:00 price refresh the pricing service received about 400 identical requests
for the same SKU within one second and rate-limited us. `go test -race ./...` is green, so the
team says the cache is thread-safe.
