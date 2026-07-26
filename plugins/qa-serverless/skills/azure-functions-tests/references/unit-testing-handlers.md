# Unit-testing handlers

Testing handler code directly avoids the overhead of a running host. The
approach differs by language. Companion to the `azure-functions-tests` skill.

## .NET isolated worker model

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

## Node.js (v4 programming model)

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

## Python (v2 programming model)

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
