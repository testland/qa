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
