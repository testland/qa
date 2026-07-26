# Triggering functions and CI

How to fire HTTP, queue, and timer triggers against the local host, and how to
wire the local runtime into CI. Companion to the `azure-functions-tests` skill.

## HTTP trigger

```bash
# GET
curl http://localhost:7071/api/HttpExample?name=World

# POST
curl --request POST http://localhost:7071/api/HttpExample \
     --data '{"name":"World"}'
```

## Non-HTTP triggers (admin endpoint)

Per
[learn.microsoft.com/azure/azure-functions/functions-manually-run-non-http](https://learn.microsoft.com/en-us/azure/azure-functions/functions-manually-run-non-http),
non-HTTP triggers can be fired via the admin endpoint. Authorization is
bypassed locally:

```bash
# Queue trigger named QueueExample
curl --request POST \
     -H "Content-Type: application/json" \
     --data '{"input":"sample queue payload"}' \
     http://localhost:7071/admin/functions/QueueExample

# Timer trigger named TimerExample (empty input is valid)
curl --request POST \
     -H "Content-Type: application/json" \
     --data '{}' \
     http://localhost:7071/admin/functions/TimerExample
```

The endpoint returns HTTP 202 (Accepted) on success.

## CI integration

```yaml
jobs:
  azure-functions-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install Core Tools
        run: |
          curl https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > microsoft.gpg
          sudo mv microsoft.gpg /etc/apt/trusted.gpg.d/microsoft.gpg
          sudo sh -c 'echo "deb [arch=amd64] https://packages.microsoft.com/repos/microsoft-ubuntu-$(lsb_release -cs)-prod $(lsb_release -cs) main" > /etc/apt/sources.list.d/dotnetdev.list'
          sudo apt-get update && sudo apt-get install -y azure-functions-core-tools-4
      - name: Start Azurite
        run: npx azurite --silent &
      - name: Run unit tests
        run: dotnet test   # or: pytest / npm test
```
