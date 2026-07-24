---
name: azure-functions-tests
description: "Runs Azure Functions locally using Azure Functions Core Tools v4 (`func start`), Azurite storage emulation, and framework-native unit tests for handler code (.NET isolated worker model, Node.js v4, Python v2). Covers HTTP, queue, and timer trigger testing, admin-endpoint invocation for non-HTTP triggers, and binding verification via local.settings.json. Use when testing Azure Functions before deployment, reproducing trigger behaviour without live Azure services, or gating function handler logic in CI."
metadata:
  keywords: "azure-functions, func-start, azurite, isolated-worker, http-trigger, queue-trigger, timer-trigger, serverless, local-testing"
---

# azure-functions-tests

## Overview

Azure Functions Core Tools v4 (`func.exe`) provides a local runtime that
mirrors the Functions host on Azure. Per
[learn.microsoft.com/azure/azure-functions/functions-run-local](https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local),
`func start` starts all triggers in the project directory and outputs the
URL of every HTTP-triggered function. Azurite emulates Blob, Queue, and
Table Storage locally so queue and timer triggers can be exercised without
a live storage account.

Nearest neighbours and how this skill differs:

- `aws-sam-local-testing` wraps SAM Local for Lambda/API Gateway.
  This skill is Azure-only and covers `func start`, Azurite, the .NET
  isolated worker model, and admin-endpoint invocation.
- `lambda-test-tools-net` covers the .NET Lambda test runner. This
  skill covers the .NET isolated worker model (`Microsoft.Azure.Functions.Worker`).
- `serverless-integration-test-builder` builds multi-function integration
  harnesses. This skill covers the per-function local invocation workflow.

## When to use

- Local unit + integration tests for Azure Function handlers before deploy.
- Reproducing HTTP, queue, or timer trigger behaviour without deploying.
- CI gating on function handler logic in .NET, Node.js, or Python.
- Verifying binding configuration with Azurite instead of live Azure Storage.

## Install

```bash
# macOS
brew tap azure/functions
brew install azure-functions-core-tools@4

# Ubuntu/Debian (see full APT steps at learn.microsoft.com/azure/azure-functions/functions-run-local#install-the-azure-functions-core-tools)
sudo apt-get install azure-functions-core-tools-4

# Windows: download the MSI from
# https://go.microsoft.com/fwlink/?linkid=2174087 (64-bit) per the Core Tools docs
```

Verify:

```bash
func --version   # must be 4.x
```

Install Azurite via npm, per
[learn.microsoft.com/azure/storage/common/storage-install-azurite](https://learn.microsoft.com/en-us/azure/storage/common/storage-install-azurite):

```bash
npm install -g azurite
```

## Project initialisation

```bash
# .NET isolated worker model (recommended; in-process support ends 2026-11-10
# per learn.microsoft.com/azure/azure-functions/dotnet-isolated-in-process-differences)
func init MyApp --worker-runtime dotnet-isolated

# Node.js (v4 programming model)
func init MyApp --worker-runtime javascript --model V4

# Python (v2 programming model)
func init MyApp --worker-runtime python --model V2

# Add a trigger template
func new --template "Http Trigger" --name HttpExample
func new --template "Azure Queue Storage Trigger" --name QueueExample
func new --template "Timer trigger" --name TimerExample
```

## local.settings.json

Per
[learn.microsoft.com/azure/azure-functions/functions-develop-local](https://learn.microsoft.com/en-us/azure/azure-functions/functions-develop-local),
`local.settings.json` holds app settings used only when running locally.
Set `AzureWebJobsStorage` to `UseDevelopmentStorage=true` to route storage
triggers to Azurite:

```json
{
  "IsEncrypted": false,
  "Values": {
    "FUNCTIONS_WORKER_RUNTIME": "dotnet-isolated",
    "AzureWebJobsStorage": "UseDevelopmentStorage=true"
  }
}
```

Never commit `local.settings.json` to source control; it may contain
connection strings.

## Start Azurite

Azurite emulates Blob (port 10000), Queue (port 10001), and Table (port 10002)
per
[learn.microsoft.com/azure/storage/common/storage-install-azurite](https://learn.microsoft.com/en-us/azure/storage/common/storage-install-azurite).
Start it before `func start`:

```bash
azurite --silent --location ./azurite-data
```

For Docker:

```bash
docker run -p 10000:10000 -p 10001:10001 -p 10002:10002 \
    mcr.microsoft.com/azure-storage/azurite
```

## Start the local Functions host

From the project root, per
[learn.microsoft.com/azure/azure-functions/functions-run-local#start-the-functions-runtime](https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local#start-the-functions-runtime):

```bash
func start
```

Output includes HTTP trigger URLs, e.g.:

```
Http Function HttpExample: http://localhost:7071/api/HttpExample
```

By default, HTTP authorization is not enforced locally (all requests are
treated as `authLevel = "anonymous"`). Pass `--enableAuth` to require
authorization during local testing.

## Testing triggers

### HTTP trigger

```bash
# GET
curl http://localhost:7071/api/HttpExample?name=World

# POST
curl --request POST http://localhost:7071/api/HttpExample \
     --data '{"name":"World"}'
```

### Non-HTTP triggers (admin endpoint)

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

## Unit-testing handlers

Testing handler code directly avoids the overhead of a running host. The
approach differs by language.

### .NET isolated worker model

The .NET isolated worker model runs function code in a separate worker
process from the Functions host, per
[learn.microsoft.com/azure/azure-functions/dotnet-isolated-in-process-differences](https://learn.microsoft.com/en-us/azure/azure-functions/dotnet-isolated-in-process-differences).
The core packages are `Microsoft.Azure.Functions.Worker` and
`Microsoft.Azure.Functions.Worker.Sdk`. HTTP triggers use
`HttpRequestData` / `HttpResponseData` (not `HttpRequest`/`IActionResult`)
unless ASP.NET Core integration is enabled.

Because handler classes can use dependency injection, extract service
dependencies behind interfaces and substitute test doubles. The
`FunctionContext` can be mocked with any standard mock library.

```csharp
// Handler under test
public class HttpExample
{
    [Function("HttpExample")]
    public HttpResponseData Run(
        [HttpTrigger(AuthorizationLevel.Function, "get", "post")] HttpRequestData req,
        FunctionContext context)
    {
        var response = req.CreateResponse(HttpStatusCode.OK);
        response.WriteString("Hello from Azure Functions");
        return response;
    }
}

// xUnit test - construct HttpRequestData via a mock FunctionContext
// (use Moq, NSubstitute, or similar for FunctionContext and HttpRequestData)
[Fact]
public async Task Run_ReturnsOk()
{
    var context = new Mock<FunctionContext>();
    var request = CreateMockHttpRequest(context.Object, HttpMethod.Get);

    var function = new HttpExample();
    var response = function.Run(request, context.Object);

    Assert.Equal(HttpStatusCode.OK, response.StatusCode);
}
```

### Node.js (v4 programming model)

```js
// handler.js
const { app } = require('@azure/functions');

app.http('HttpExample', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    const name = request.query.get('name') || 'World';
    return { body: `Hello, ${name}!` };
  },
});

// handler.test.js (Jest)
const { handler } = require('./handler');

test('returns greeting', async () => {
  const req = { query: new URLSearchParams('name=Test'), text: async () => '' };
  const ctx = { log: jest.fn() };
  const res = await handler(req, ctx);
  expect(res.body).toBe('Hello, Test!');
});
```

### Python (v2 programming model)

```python
# function_app.py
import azure.functions as func
app = func.FunctionApp()

@app.route(route="HttpExample")
def http_example(req: func.HttpRequest) -> func.HttpResponse:
    name = req.params.get('name', 'World')
    return func.HttpResponse(f"Hello, {name}!")

# test_function_app.py (pytest)
import azure.functions as func
from function_app import http_example

def test_http_example():
    req = func.HttpRequest(
        method='GET',
        url='/api/HttpExample',
        params={'name': 'Test'},
        body=b''
    )
    resp = http_example(req)
    assert resp.status_code == 200
    assert 'Test' in resp.get_body().decode()
```

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

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Skip Azurite for queue/timer triggers | Queue and storage triggers require `AzureWebJobsStorage`; without it `func start` errors | Start Azurite and set `"AzureWebJobsStorage": "UseDevelopmentStorage=true"` in `local.settings.json` |
| Use in-process model for new projects | Support for in-process model ends 2026-11-10 per [learn.microsoft.com/azure/azure-functions/dotnet-isolated-in-process-differences](https://learn.microsoft.com/en-us/azure/azure-functions/dotnet-isolated-in-process-differences) | Use `--worker-runtime dotnet-isolated` |
| Hard-code connection strings in code | Secrets leak to source control | Use `local.settings.json` `Values` array; it is git-ignored by default |
| Call admin endpoint without `Content-Type: application/json` | Host rejects the request | Always include `Content-Type: application/json` header and `{"input":"..."}` body |
| Commit `local.settings.json` | Contains secrets | Verify `.gitignore` excludes it; use `func settings` to sync with Azure app settings |
| Use `func host start` for Core Tools v4 | Command removed in v4; it was v1.x syntax per Core Tools docs | Use `func start` |

## Limitations

- Azurite does not emulate Azure Files or Azure Data Lake Storage Gen2,
  per
  [learn.microsoft.com/azure/storage/common/storage-use-azurite](https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azurite).
  Functions that use these services must connect to live Azure Storage
  during local testing.
- Event Grid triggers require extra configuration to run locally; the
  admin-endpoint approach does not cover them. See
  [learn.microsoft.com/azure/azure-functions/functions-run-local#run-a-local-function](https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local#run-a-local-function)
  for the viewer web app approach.
- Managed Identity authentication and RBAC roles cannot be replicated
  by `func start`. Test with connection strings locally; verify RBAC
  in a staging environment.
- Cold-start behaviour differs from production. For cold-start budgets see
  `cold-start-budget-reference`.

## References

- Core Tools install and `func start`:
  [learn.microsoft.com/azure/azure-functions/functions-run-local](https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local)
- Local development overview:
  [learn.microsoft.com/azure/azure-functions/functions-develop-local](https://learn.microsoft.com/en-us/azure/azure-functions/functions-develop-local)
- .NET isolated worker model guide:
  [learn.microsoft.com/azure/azure-functions/dotnet-isolated-process-guide](https://learn.microsoft.com/en-us/azure/azure-functions/dotnet-isolated-process-guide)
- In-process vs isolated model comparison:
  [learn.microsoft.com/azure/azure-functions/dotnet-isolated-in-process-differences](https://learn.microsoft.com/en-us/azure/azure-functions/dotnet-isolated-in-process-differences)
- Azurite install and run:
  [learn.microsoft.com/azure/storage/common/storage-install-azurite](https://learn.microsoft.com/en-us/azure/storage/common/storage-install-azurite)
- Azurite emulator overview:
  [learn.microsoft.com/azure/storage/common/storage-use-azurite](https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azurite)
- Manually run non-HTTP triggers:
  [learn.microsoft.com/azure/azure-functions/functions-manually-run-non-http](https://learn.microsoft.com/en-us/azure/azure-functions/functions-manually-run-non-http)
- Sibling skills:
  `aws-sam-local-testing`,
  `lambda-test-tools-net`,
  `cold-start-budget-reference`,
  `netlify-functions-tests`,
  `vercel-edge-runtime-testing`,
  `serverless-integration-test-builder`
