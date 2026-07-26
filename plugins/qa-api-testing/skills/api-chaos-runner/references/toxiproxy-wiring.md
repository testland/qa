# Toxiproxy wiring and matrix runner

Full setup for placing Toxiproxy between the client and upstream,
registering proxies, adding toxics, and running the chaos matrix.
Referenced from the api-chaos-runner skill's Step 3.

## Setup (Docker example)

```yaml
# docker-compose.test.yml
services:
  toxiproxy:
    image: ghcr.io/shopify/toxiproxy:latest
    ports:
      - 8474:8474   # control API
      - 5432:5432   # proxied DB
      - 8080:8080   # proxied API
  app:
    build: .
    environment:
      DATABASE_URL: 'postgres://user:pass@toxiproxy:5432/db'
      EXTERNAL_API_URL: 'http://toxiproxy:8080'
```

Per [toxiproxy-readme][toxiproxy], the application points at
Toxiproxy's listen ports rather than the upstream. Toxiproxy
forwards to the real upstream when no toxic is active.

## Define proxies via the control API

```bash
# Register the upstream
curl -d '{"name":"orders-api","listen":"0.0.0.0:8080","upstream":"orders-api-real:8080"}' \
  http://toxiproxy:8474/proxies
```

## Add a toxic during a test

Per [toxiproxy-readme][toxiproxy]:

```bash
# 1000ms latency on every request through this proxy
toxiproxy-cli toxic add -t latency -a latency=1000 orders-api

# Bandwidth cap at 10 KB/s
toxiproxy-cli toxic add -t bandwidth -a rate=10 orders-api

# Forced timeout
toxiproxy-cli toxic add -t timeout -a timeout=5000 orders-api

# Remove all toxics
toxiproxy-cli toxic remove orders-api -n <toxic-name>
```

For a stateless add-test-remove cycle, the language-native client
libraries (`toxiproxy-python`, `toxiproxy-node`, `toxiproxy-ruby`,
`toxiproxy-go`) wrap the HTTP API.

## Run the matrix

A minimal runner shell script:

```bash
#!/usr/bin/env bash
# scripts/chaos-matrix.sh
set -e

PROXY=orders-api
TEST_CMD="npx newman run collections/orders.postman_collection.json -e environments/chaos.json -r cli,junit --reporter-junit-export results-$1.xml"

run_with_toxic() {
  local label="$1"; local type="$2"; local args="$3"
  echo "=== $label ==="
  toxiproxy-cli toxic remove "$PROXY" -n latency 2>/dev/null || true
  toxiproxy-cli toxic remove "$PROXY" -n bandwidth 2>/dev/null || true
  toxiproxy-cli toxic remove "$PROXY" -n timeout 2>/dev/null || true
  if [ -n "$type" ]; then
    toxiproxy-cli toxic add -t "$type" $args "$PROXY"
  fi
  $TEST_CMD "$label" || true   # don't bail; we want the matrix
}

run_with_toxic 'control'   ''        ''
run_with_toxic 'latency-1s' latency  '-a latency=1000'
run_with_toxic 'bandwidth' bandwidth '-a rate=10'
run_with_toxic 'timeout'   timeout   '-a timeout=5000'
```

The matrix produces one JUnit XML per scenario. Aggregate them in
the report stage.

[toxiproxy]: https://github.com/Shopify/toxiproxy
