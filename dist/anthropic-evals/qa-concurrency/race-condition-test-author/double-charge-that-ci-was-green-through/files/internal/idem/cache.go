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
