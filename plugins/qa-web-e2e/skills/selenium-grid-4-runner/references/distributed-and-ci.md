# Selenium Grid 4 - fully-distributed layout and CI

Deep-dive extensions to `selenium-grid-4-runner`. Standalone and hub-and-node
(both in the parent SKILL.md) cover almost every team; reach for these only when
the grid must scale past a single hub or run in CI.

## Fully-distributed mode (all components separated)

For very large deployments, run each of the six components as its own process
instead of one hub JVM. Most teams do NOT need this - hub-and-node is the default.

```bash
# Event Bus
java -jar selenium-server.jar event-bus --port 5557

# New Session Queue
java -jar selenium-server.jar sessionqueue --port 5559

# Session Map
java -jar selenium-server.jar sessions --port 5556

# Distributor
java -jar selenium-server.jar distributor --port 5553 \
  --sessions http://sessions-host:5556 \
  --sessionqueue http://queue-host:5559 \
  --bind-bus-events false \
  --publish-events tcp://event-bus-host:4442 \
  --subscribe-events tcp://event-bus-host:4443

# Router
java -jar selenium-server.jar router --port 4444 \
  --sessions http://sessions-host:5556 \
  --distributor http://distributor-host:5553 \
  --sessionqueue http://queue-host:5559

# Node(s)
java -jar selenium-server.jar node \
  --publish-events tcp://event-bus-host:4442 \
  --subscribe-events tcp://event-bus-host:4443
```

## CI integration (GitHub Actions)

Boot the grid, gate on `/status` ready before running tests, and always tear down:

```yaml
on: pull_request
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - name: Start Selenium Grid
        run: docker-compose -f selenium-grid.yml up -d
      - name: Wait for Grid ready
        run: |
          for i in {1..30}; do
            curl -s http://localhost:4444/wd/hub/status | grep -q '"ready":true' && break
            sleep 2
          done
      - name: Run E2E tests
        run: pytest tests/e2e/ --grid-url=http://localhost:4444/wd/hub
      - name: Tear down Grid
        if: always()
        run: docker-compose -f selenium-grid.yml down
```
