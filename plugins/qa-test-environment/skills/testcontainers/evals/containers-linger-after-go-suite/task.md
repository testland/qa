# Self-hosted runner filled up with leftover test containers

## Problem Description

The build runner ran out of disk on Friday and every job on it failed.
`docker ps -a` listed about four hundred exited `postgres` and `redis`
containers plus a pile of anonymous volumes, the oldest from six weeks ago. They
all come from the Go integration suite.

`store_test.go` removes its container with a `defer` written after the error
check, so any run where startup fails and the test calls `t.Fatal` leaves the
container behind. `queue_test.go` never removes anything at all. And when someone
cancels a job from the GitHub UI, or the runner kills the process on timeout,
nothing is removed either way.

Our workaround is a `make ci-cleanup` step that force-removes every container on
the runner at the end of the job. Last month it ran while another job was mid-run
and destroyed that job's containers, so we cannot keep it.

The `env:` block in the workflow was copied from a developer's laptop notes when
the suite was first set up. Nobody has looked at it since.

## Output Specification

1. Rework `internal/store/store_test.go` and `internal/queue/queue_test.go` so a
   container is removed when the test passes, when it fails before the container
   is usable, when it panics, and when the whole process is killed.
2. Delete the blanket cleanup - both the workflow step and the `ci-cleanup`
   target. The suite must clean up after itself without touching containers it
   did not create.
3. The workflow's `env:` block must not carry settings that suppress automatic
   cleanup or keep containers alive between runs. State in the workflow what is
   left and why.
4. Do not change what the tests assert.

## Input Files

Extract the following files before beginning.

=============== FILE: internal/store/store_test.go ===============
package store

import (
	"context"
	"testing"

	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
)

func TestSaveAndLoadOrder(t *testing.T) {
	ctx := context.Background()

	pg, err := testcontainers.Run(ctx, "postgres:15",
		testcontainers.WithExposedPorts("5432/tcp"),
		testcontainers.WithEnv(map[string]string{
			"POSTGRES_DB":       "app",
			"POSTGRES_PASSWORD": "test",
		}),
		testcontainers.WithWaitStrategy(wait.ForListeningPort("5432/tcp")),
	)
	if err != nil {
		t.Fatalf("start postgres: %v", err)
	}
	defer pg.Terminate(ctx)

	s := mustOpen(t, ctx, pg)
	if err := s.Save(ctx, Order{ID: "o-1", Customer: "ada", TotalCents: 4200}); err != nil {
		t.Fatalf("save: %v", err)
	}

	got, err := s.Load(ctx, "o-1")
	if err != nil {
		t.Fatalf("load: %v", err)
	}
	if got.TotalCents != 4200 {
		t.Fatalf("total = %d, want 4200", got.TotalCents)
	}
}

=============== FILE: internal/queue/queue_test.go ===============
package queue

import (
	"context"
	"testing"

	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
)

func TestEnqueueDequeue(t *testing.T) {
	ctx := context.Background()

	rd, err := testcontainers.Run(ctx, "redis:7",
		testcontainers.WithExposedPorts("6379/tcp"),
		testcontainers.WithWaitStrategy(wait.ForLog("Ready to accept connections")),
	)
	if err != nil {
		t.Fatalf("start redis: %v", err)
	}

	q := mustConnect(t, ctx, rd)
	if err := q.Enqueue(ctx, "job-1"); err != nil {
		t.Fatalf("enqueue: %v", err)
	}

	job, err := q.Dequeue(ctx)
	if err != nil {
		t.Fatalf("dequeue: %v", err)
	}
	if job != "job-1" {
		t.Fatalf("job = %q, want job-1", job)
	}
}

=============== FILE: .github/workflows/integration.yml ===============
name: integration
on:
  pull_request:
  push:
    branches: [main]

jobs:
  it:
    runs-on: [self-hosted, linux, x64]
    env:
      TESTCONTAINERS_RYUK_DISABLED: "true"
      TESTCONTAINERS_REUSE_ENABLE: "true"
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-go@v5
        with:
          go-version: '1.23'
      - run: go test ./internal/... -tags=integration -timeout 20m
      - name: clean up docker
        if: always()
        run: make ci-cleanup

=============== FILE: Makefile ===============
.PHONY: integration ci-cleanup

integration:
	go test ./internal/... -tags=integration -timeout 20m

ci-cleanup:
	docker rm -f $$(docker ps -aq) 2>/dev/null || true
	docker volume prune -f
