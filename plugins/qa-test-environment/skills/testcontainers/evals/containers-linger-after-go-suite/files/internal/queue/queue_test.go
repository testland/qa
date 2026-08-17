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
