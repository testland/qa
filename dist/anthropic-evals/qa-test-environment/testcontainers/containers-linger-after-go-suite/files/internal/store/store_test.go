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
