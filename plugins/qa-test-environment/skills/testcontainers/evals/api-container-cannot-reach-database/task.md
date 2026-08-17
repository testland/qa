# The API container cannot connect to the database the test just started

## Problem Description

`internal/e2e/api_test.go` starts a Postgres container, seeds two rows into it
from the test process, then starts our API image pointing at that database. The
test then calls the API over HTTP and checks the response.

The seeding works. The API container does not: its log fills with

```
dial tcp 127.0.0.1:54327: connect: connection refused
```

and the test fails waiting for `/healthz` to answer. `54327` is the address the
test itself is using and it is definitely correct - the seed statements ran
against it a moment earlier, and running the API binary directly on the laptop
with that exact `DATABASE_URL` works fine.

Someone suggested we just give up and run the API in-process instead of as a
container, but the whole point of this test is that we exercise the shipped
image.

## Output Specification

1. Make the API container able to reach the database container.
2. The test process must still be able to talk to the database directly - it
   seeds rows before the API starts and asserts on rows afterwards.
3. Both containers and anything created to connect them must be removed when the
   test ends, in an order that cannot fail because something is still attached.
4. Do not change what the test asserts, and do not replace the container with an
   in-process server.

## Input Files

Extract the following files before beginning.

=============== FILE: internal/e2e/api_test.go ===============
package e2e

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
)

func TestListOrdersEndpoint(t *testing.T) {
	ctx := context.Background()

	pg, err := testcontainers.Run(ctx, "postgres:15",
		testcontainers.WithExposedPorts("5432/tcp"),
		testcontainers.WithEnv(map[string]string{
			"POSTGRES_DB":       "app",
			"POSTGRES_USER":     "app",
			"POSTGRES_PASSWORD": "test",
		}),
		testcontainers.WithWaitStrategy(wait.ForListeningPort("5432/tcp")),
	)
	testcontainers.CleanupContainer(t, pg)
	if err != nil {
		t.Fatalf("start postgres: %v", err)
	}

	dbHost, err := pg.Host(ctx)
	if err != nil {
		t.Fatalf("db host: %v", err)
	}
	dbPort, err := pg.MappedPort(ctx, "5432/tcp")
	if err != nil {
		t.Fatalf("db port: %v", err)
	}
	dbURL := fmt.Sprintf("postgres://app:test@%s:%s/app?sslmode=disable", dbHost, dbPort.Port())

	seed(t, ctx, dbURL)

	api, err := testcontainers.Run(ctx, "example/orders-api:test",
		testcontainers.WithExposedPorts("8080/tcp"),
		testcontainers.WithEnv(map[string]string{"DATABASE_URL": dbURL}),
		testcontainers.WithWaitStrategy(
			wait.ForHTTP("/healthz").WithPort("8080/tcp").WithStartupTimeout(60*time.Second),
		),
	)
	testcontainers.CleanupContainer(t, api)
	if err != nil {
		t.Fatalf("start api: %v", err)
	}

	base, err := api.PortEndpoint(ctx, "8080/tcp", "http")
	if err != nil {
		t.Fatalf("api endpoint: %v", err)
	}

	resp, err := http.Get(base + "/orders")
	if err != nil {
		t.Fatalf("GET /orders: %v", err)
	}
	defer resp.Body.Close()

	var orders []struct {
		ID         string `json:"id"`
		TotalCents int    `json:"total_cents"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&orders); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(orders) != 2 {
		t.Fatalf("got %d orders, want 2", len(orders))
	}
	if orders[0].TotalCents != 4200 {
		t.Fatalf("first order total = %d, want 4200", orders[0].TotalCents)
	}
}

func seed(t *testing.T, ctx context.Context, dbURL string) {
	t.Helper()

	conn, err := pgx.Connect(ctx, dbURL)
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	defer conn.Close(ctx)

	stmts := []string{
		`CREATE TABLE orders (id text PRIMARY KEY, customer text, total_cents int)`,
		`INSERT INTO orders VALUES ('o-1', 'ada', 4200)`,
		`INSERT INTO orders VALUES ('o-2', 'bob', 900)`,
	}
	for _, s := range stmts {
		if _, err := conn.Exec(ctx, s); err != nil {
			t.Fatalf("seed %q: %v", s, err)
		}
	}
}
