package pool

import (
	"database/sql"
	"sync"
	"time"
)

// Job is one unit of ingest work.
type Job func() error

// Pool runs jobs on a fixed set of workers and reports depth for metrics.
type Pool struct {
	jobs    chan Job
	results chan error
	db      *sql.DB
	wg      sync.WaitGroup
	depth   int
}

// New starts workers plus the depth reporter and the result drain.
func New(workers int, db *sql.DB) *Pool {
	p := &Pool{
		jobs:    make(chan Job, 64),
		results: make(chan error, 64),
		db:      db,
	}
	for i := 0; i < workers; i++ {
		p.wg.Add(1)
		go p.worker()
	}
	go p.reportDepth()
	go p.drainResults()
	return p
}

func (p *Pool) worker() {
	defer p.wg.Done()
	for job := range p.jobs {
		p.results <- job()
	}
}

func (p *Pool) reportDepth() {
	t := time.NewTicker(50 * time.Millisecond)
	for range t.C {
		p.depth = len(p.jobs)
	}
}

func (p *Pool) drainResults() {
	for err := range p.results {
		if err != nil {
			p.depth = 0
		}
	}
}

// Submit queues a job. Blocks when the queue is full.
func (p *Pool) Submit(j Job) { p.jobs <- j }

// Shutdown stops accepting work and waits for the workers to finish.
func (p *Pool) Shutdown() {
	close(p.jobs)
	p.wg.Wait()
}
