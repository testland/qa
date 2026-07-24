---
name: lambda-test-tools-net
description: "Wraps Amazon.Lambda.TestTool (the canonical .NET Lambda local-testing toolkit from github.com/aws/aws-lambda-dotnet) for invoking Lambda handlers from xUnit / NUnit tests with simulated AWS Lambda contexts (ILambdaContext, ILambdaSerializer). Covers handler-direct invocation, mock context fixtures, the dotnet-lambda CLI, and integration with the .NET LambdaSerializer for JSON. Use when testing AWS Lambda functions written in C#/.NET."
---

# lambda-test-tools-net

## Overview

`Amazon.Lambda.TestTool` is AWS's canonical .NET package for
testing Lambda functions. Per
[github.com/aws/aws-lambda-dotnet](https://github.com/aws/aws-lambda-dotnet/tree/master/Tools/LambdaTestTool),
it provides a Mock Lambda Test Tool (Windows / Mac / Linux UI to
manually invoke Lambdas) plus library-level fakes for
ILambdaContext.

For automated tests, the pattern is **handler-direct invocation**
with a mock context.

## When to use

- xUnit / NUnit tests for .NET Lambda handlers.
- Verifying handler logic without spinning up `dotnet lambda
  invoke` per test.
- CI integration with deterministic, fast tests.

## Authoring

### Install

```bash
dotnet add package Amazon.Lambda.Core
dotnet add package Amazon.Lambda.Serialization.SystemTextJson
dotnet add package Amazon.Lambda.TestUtilities    # NUnit-friendly mocks
dotnet add package Microsoft.NET.Test.Sdk
dotnet add package xunit
```

### Handler example

```csharp
using Amazon.Lambda.Core;
using Amazon.Lambda.Serialization.SystemTextJson;

[assembly: LambdaSerializer(typeof(DefaultLambdaJsonSerializer))]

public class Functions
{
    public string Handler(string input, ILambdaContext context)
    {
        context.Logger.LogLine($"Got input: {input}");
        return input.ToUpper();
    }
}
```

### Test with TestLambdaContext

Per [aws-lambda-dotnet Amazon.Lambda.TestUtilities](https://github.com/aws/aws-lambda-dotnet/tree/master/Libraries/src/Amazon.Lambda.TestUtilities):

```csharp
using Amazon.Lambda.TestUtilities;
using Xunit;

public class FunctionsTests
{
    [Fact]
    public void Handler_Uppercases()
    {
        var functions = new Functions();
        var context = new TestLambdaContext
        {
            FunctionName = "test-fn",
            RemainingTime = TimeSpan.FromSeconds(30),
            // Logger is auto-set to TestLambdaLogger
        };

        var result = functions.Handler("hello", context);

        Assert.Equal("HELLO", result);
    }

    [Fact]
    public void Handler_LogsInput()
    {
        var functions = new Functions();
        var context = new TestLambdaContext();

        functions.Handler("hi", context);

        var logger = (TestLambdaLogger)context.Logger;
        Assert.Contains("Got input: hi", logger.Buffer.ToString());
    }
}
```

### Testing remaining-time behaviour

Per `lambda-timeout-budget-reference`,
handlers that check `Context.RemainingTime`:

```csharp
[Fact]
public void Handler_EarlyReturnsWhenTimeLow()
{
    var functions = new Functions();
    var context = new TestLambdaContext
    {
        RemainingTime = TimeSpan.FromSeconds(3)  // Below 5s threshold
    };

    var result = functions.Handler("work-that-takes-time", context);

    Assert.Contains("partial", result);
}
```

### Test with serialised event payloads

```csharp
[Fact]
public void Handler_ParsesApiGatewayEvent()
{
    var json = File.ReadAllText("Events/apigw-request.json");
    var serializer = new DefaultLambdaJsonSerializer();
    var request = serializer.Deserialize<APIGatewayProxyRequest>(json);

    var functions = new Functions();
    var response = functions.HandleApi(request, new TestLambdaContext());

    Assert.Equal(200, response.StatusCode);
}
```

### dotnet-lambda CLI (for the deploy + invoke path)

Per [github.com/aws/aws-extensions-for-dotnet-cli](https://github.com/aws/aws-extensions-for-dotnet-cli):

```bash
dotnet tool install -g Amazon.Lambda.Tools

dotnet lambda invoke-function MyFunction --payload '"hello"'
```

For local-only testing, prefer the handler-direct pattern above.

## Running

```bash
dotnet test
```

For watch-mode:

```bash
dotnet watch test
```

## CI integration

```yaml
jobs:
  dotnet-lambda-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-dotnet@v4
        with: { dotnet-version: '8.0.x' }
      - run: dotnet restore
      - run: dotnet test --no-build --verbosity normal
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Spawn `dotnet lambda invoke` per test | Network calls; slow; rate-limited | Handler-direct invocation |
| Skip `TestLambdaContext` | Real ILambdaContext is required; null fails | Always pass a context |
| `RemainingTime = TimeSpan.MaxValue` | Doesn't exercise timeout logic | Set realistic remaining time |
| Hand-rolled APIGatewayProxyRequest | Schema drift | Generate via `sam local generate-event` or commit fixture |
| Test using prod IAM | Permissions surprise in CI | Use mock service clients |
| No assertion on logger output | Logger bugs slip through | Inspect TestLambdaLogger.Buffer |
| Serializer not registered | `LambdaSerializer` attribute missing → runtime fails | Add assembly attribute |
| Mocking the Logger | Loses TestLambdaLogger's buffer-replay capability | Use TestLambdaContext's default logger |

## Limitations

- **No JIT / native AoT difference.** Local handler invocation
  uses standard .NET JIT; AOT-compiled Lambdas (ReadyToRun /
  Native AOT) behave differently. Pair with deployed-Lambda
  tests for production representativeness.
- **Doesn't test the runtime API.** The Lambda runtime API
  (responsible for `next` / `response` polling) isn't invoked;
  bugs in handler-vs-runtime contract slip through.
- **Doesn't test cold-start budget per `cold-start-budget-reference`.**
  In-process tests are warm; AOT cold-start savings invisible.
- **Custom serializer paths.** If your handler uses a
  non-default JSON serializer, set up the assembly attribute
  identically in tests.

## References

- aws-lambda-dotnet:
  [github.com/aws/aws-lambda-dotnet](https://github.com/aws/aws-lambda-dotnet).
- Amazon.Lambda.TestUtilities:
  [github.com/aws/aws-lambda-dotnet/tree/master/Libraries/src/Amazon.Lambda.TestUtilities](https://github.com/aws/aws-lambda-dotnet/tree/master/Libraries/src/Amazon.Lambda.TestUtilities).
- Mock Lambda Test Tool:
  [github.com/aws/aws-lambda-dotnet/tree/master/Tools/LambdaTestTool](https://github.com/aws/aws-lambda-dotnet/tree/master/Tools/LambdaTestTool).
- dotnet-lambda CLI:
  [github.com/aws/aws-extensions-for-dotnet-cli](https://github.com/aws/aws-extensions-for-dotnet-cli).
- Companion catalogs:
  `cold-start-budget-reference`,
  `lambda-timeout-budget-reference`.
- Sibling tools:
  `aws-sam-local-testing`
  (Node/Python/Java equivalent).
