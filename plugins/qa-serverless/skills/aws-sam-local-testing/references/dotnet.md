# .NET Lambda testing - Amazon.Lambda.TestUtilities and the dotnet-lambda CLI

For C#/.NET Lambdas the fast path is **handler-direct invocation** with a
mock context, not spawning `sam local invoke` per test. AWS's canonical
toolkit is [aws-lambda-dotnet](https://github.com/aws/aws-lambda-dotnet):
`Amazon.Lambda.TestUtilities` for library-level fakes plus the
[Mock Lambda Test Tool](https://github.com/aws/aws-lambda-dotnet/tree/master/Tools/LambdaTestTool)
UI for manual invocation.

## Install

```bash
dotnet add package Amazon.Lambda.Core
dotnet add package Amazon.Lambda.Serialization.SystemTextJson
dotnet add package Amazon.Lambda.TestUtilities
dotnet add package Microsoft.NET.Test.Sdk
dotnet add package xunit
```

## Handler + TestLambdaContext

Per [Amazon.Lambda.TestUtilities](https://github.com/aws/aws-lambda-dotnet/tree/master/Libraries/src/Amazon.Lambda.TestUtilities):

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

```csharp
using Amazon.Lambda.TestUtilities;
using Xunit;

[Fact]
public void Handler_Uppercases()
{
    var context = new TestLambdaContext
    {
        FunctionName = "test-fn",
        RemainingTime = TimeSpan.FromSeconds(30),  // Logger auto-set to TestLambdaLogger
    };
    Assert.Equal("HELLO", new Functions().Handler("hello", context));
}

[Fact]
public void Handler_LogsInput()
{
    var context = new TestLambdaContext();
    new Functions().Handler("hi", context);
    var logger = (TestLambdaLogger)context.Logger;
    Assert.Contains("Got input: hi", logger.Buffer.ToString());
}
```

## Remaining-time behaviour

Set `RemainingTime` low to exercise timeout-aware handlers (the
early-return pattern in the cold-start-budget-reference
references/timeout-budgets.md):

```csharp
var context = new TestLambdaContext { RemainingTime = TimeSpan.FromSeconds(3) };
var result = new Functions().Handler("work-that-takes-time", context);
Assert.Contains("partial", result);
```

## Serialised event payloads

```csharp
var json = File.ReadAllText("Events/apigw-request.json");   // from sam local generate-event
var request = new DefaultLambdaJsonSerializer().Deserialize<APIGatewayProxyRequest>(json);
var response = new Functions().HandleApi(request, new TestLambdaContext());
Assert.Equal(200, response.StatusCode);
```

## dotnet-lambda CLI (deploy + invoke path)

Per [aws-extensions-for-dotnet-cli](https://github.com/aws/aws-extensions-for-dotnet-cli):

```bash
dotnet tool install -g Amazon.Lambda.Tools
dotnet lambda invoke-function MyFunction --payload '"hello"'
```

For local-only testing, prefer handler-direct invocation.

## CI

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
| Skip `TestLambdaContext` | Null context fails at runtime | Always pass one |
| `RemainingTime = TimeSpan.MaxValue` | Timeout logic never exercised | Realistic remaining time |
| Hand-rolled `APIGatewayProxyRequest` | Schema drift | `sam local generate-event` fixture |
| Missing `[assembly: LambdaSerializer]` | Runtime deserialization fails | Register the serializer in tests too |
| Mocking the Logger | Loses `TestLambdaLogger.Buffer` replay | Use the default TestLambdaContext logger |

## Limitations

- In-process tests use the standard JIT; ReadyToRun / Native AOT Lambdas
  behave differently - pair with deployed-Lambda tests.
- The Lambda runtime API (`next`/`response` polling) is not exercised.
- Cold-start behaviour is invisible warm-in-process; see the parent
  skill's budget tables.

## References

- aws-lambda-dotnet: [github.com/aws/aws-lambda-dotnet](https://github.com/aws/aws-lambda-dotnet)
- Amazon.Lambda.TestUtilities:
  [github.com/aws/aws-lambda-dotnet/tree/master/Libraries/src/Amazon.Lambda.TestUtilities](https://github.com/aws/aws-lambda-dotnet/tree/master/Libraries/src/Amazon.Lambda.TestUtilities)
- dotnet-lambda CLI:
  [github.com/aws/aws-extensions-for-dotnet-cli](https://github.com/aws/aws-extensions-for-dotnet-cli)
