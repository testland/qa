---
name: grpc-interceptor-test-author
description: "Authors unit tests for gRPC interceptor logic: Go grpc.UnaryServerInterceptor/grpc.UnaryClientInterceptor, Java ServerInterceptor/ClientInterceptor, and grpc-js client interceptors. Covers auth interceptors (Unauthenticated on bad token), retry interceptors (exponential backoff on Unavailable), logging/tracing interceptors (metadata extraction and propagation), error-mapping interceptors (status code translation), and chained interceptor ordering. Use when a gRPC interceptor is written or modified and you need tests that verify the interceptor fires correctly, rejects bad input, propagates metadata, and chains in the right order without a live backend."
metadata:
  keywords: "grpc, interceptor, unary, streaming, auth, retry, metadata, tracing, go, java, grpc-js"
---

# grpc-interceptor-test-author

## Overview

gRPC interceptors apply cross-cutting behavior (auth, retry, logging,
error mapping) to every RPC without touching service logic. They are
one of the primary sources of subtle gRPC bugs: silent metadata drops,
wrong ordering in a chain, and retry storms that ignore backoff. This
skill produces isolated unit tests for each interceptor behavior.

Per the
[gRPC interceptors guide](https://grpc.io/docs/guides/interceptors/),
interceptors are "per-call" and are split into client-side and
server-side variants, each further divided into unary and streaming
forms.

Differentiation from sibling skills:

- `grpc-mock` authors tests for service handler logic using an
  in-process server. This skill tests the interceptor layer itself,
  not the handler.
- `grpc-streaming-test-author` covers multi-message stream sequences.
  This skill covers interceptors that wrap streams (e.g., a server
  stream interceptor that injects a header before the first message).

## Interceptor taxonomy

| Variant | Go type (pkg.go.dev/google.golang.org/grpc) | Java type (grpc-java javadoc) | grpc-js |
|---|---|---|---|
| Server unary | `grpc.UnaryServerInterceptor` | `ServerInterceptor.interceptCall` | N/A (server-only via `grpc` package) |
| Server streaming | `grpc.StreamServerInterceptor` | `ServerInterceptor.interceptCall` | N/A |
| Client unary | `grpc.UnaryClientInterceptor` | `ClientInterceptor.interceptCall` | `InterceptorProvider` option |
| Client streaming | `grpc.StreamClientInterceptor` | `ClientInterceptor.interceptCall` | `InterceptorProvider` option |

Full type signatures are at the reference links in each section.

## Authoring

### Strategy: call the interceptor directly

The canonical test pattern for all languages is:

1. Construct the interceptor function/object directly.
2. Invoke it with a crafted context/metadata and a spy or stub `handler`
   (the `next` leg in the chain).
3. Assert on: what the handler received, what status code was returned,
   and what metadata was set.

This avoids spinning up a full in-process server just to test
cross-cutting logic. Use the in-process server from `grpc-mock` only
when testing the *interaction* between an interceptor and a handler.

### Go: auth interceptor - rejects bad token

Type signatures per
[pkg.go.dev/google.golang.org/grpc#UnaryServerInterceptor](https://pkg.go.dev/google.golang.org/grpc#UnaryServerInterceptor):

```go
type UnaryServerInterceptor func(
    ctx context.Context,
    req any,
    info *grpc.UnaryServerInfo,
    handler grpc.UnaryHandler,
) (any, error)
```

Test pattern: pass a `ctx` with missing/bad `authorization` metadata
and verify the interceptor returns `codes.Unauthenticated` (code 16 per
[pkg.go.dev/google.golang.org/grpc/codes](https://pkg.go.dev/google.golang.org/grpc/codes))
without calling the handler.

```go
package auth_test

import (
    "context"
    "testing"

    "google.golang.org/grpc"
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/metadata"
    "google.golang.org/grpc/status"
)

// authInterceptor returns Unauthenticated when "authorization" header is absent.
func authInterceptor(
    ctx context.Context,
    req any,
    info *grpc.UnaryServerInfo,
    handler grpc.UnaryHandler,
) (any, error) {
    md, ok := metadata.FromIncomingContext(ctx)
    // metadata.FromIncomingContext docs: all keys are lowercase.
    if !ok || len(md.Get("authorization")) == 0 {
        return nil, status.Error(codes.Unauthenticated, "missing authorization header")
    }
    return handler(ctx, req)
}

func TestAuthInterceptor_MissingToken_ReturnsUnauthenticated(t *testing.T) {
    handlerCalled := false
    spy := func(ctx context.Context, req any) (any, error) {
        handlerCalled = true
        return "ok", nil
    }

    ctx := context.Background() // no metadata attached
    _, err := authInterceptor(ctx, nil, nil, spy)

    if handlerCalled {
        t.Fatal("handler must not be called when token is absent")
    }
    st, _ := status.FromError(err)
    if st.Code() != codes.Unauthenticated {
        t.Fatalf("got %v, want Unauthenticated", st.Code())
    }
}

func TestAuthInterceptor_ValidToken_CallsHandler(t *testing.T) {
    handlerCalled := false
    spy := func(ctx context.Context, req any) (any, error) {
        handlerCalled = true
        return "ok", nil
    }

    md := metadata.Pairs("authorization", "Bearer valid-token")
    ctx := metadata.NewIncomingContext(context.Background(), md)
    _, err := authInterceptor(ctx, nil, nil, spy)

    if err != nil {
        t.Fatal(err)
    }
    if !handlerCalled {
        t.Fatal("handler must be called for valid token")
    }
}
```

Always assert on `status.Code()`, never on error message strings
(message text is not part of the gRPC contract).

### Go: retry interceptor - exponential backoff on Unavailable

`codes.Unavailable` (code 14) is the canonical "transient, retry"
signal per
[pkg.go.dev/google.golang.org/grpc/codes](https://pkg.go.dev/google.golang.org/grpc/codes).
A retry interceptor wraps a `grpc.UnaryClientInterceptor`:

```go
type UnaryClientInterceptor func(
    ctx context.Context,
    method string,
    req, reply any,
    cc *grpc.ClientConn,
    invoker grpc.UnaryInvoker,
    opts ...grpc.CallOption,
) error
```

Test: count how many times `invoker` is called and confirm backoff
delays using a fake clock.

```go
func TestRetryInterceptor_RetriesOnUnavailable(t *testing.T) {
    callCount := 0
    invoker := func(ctx context.Context, method string, req, reply any,
        cc *grpc.ClientConn, opts ...grpc.CallOption) error {
        callCount++
        if callCount < 3 {
            return status.Error(codes.Unavailable, "overloaded")
        }
        return nil
    }

    interceptor := retryInterceptor(maxRetries(3), noSleep()) // inject fake sleep
    err := interceptor(context.Background(), "/svc/Method", nil, nil, nil, invoker)

    if err != nil {
        t.Fatalf("expected success after retries, got %v", err)
    }
    if callCount != 3 {
        t.Fatalf("expected 3 invocations, got %d", callCount)
    }
}

func TestRetryInterceptor_DoesNotRetryPermissionDenied(t *testing.T) {
    callCount := 0
    invoker := func(_ context.Context, _ string, _, _ any,
        _ *grpc.ClientConn, _ ...grpc.CallOption) error {
        callCount++
        return status.Error(codes.PermissionDenied, "denied")
    }

    interceptor := retryInterceptor(maxRetries(3), noSleep())
    err := interceptor(context.Background(), "/svc/Method", nil, nil, nil, invoker)

    st, _ := status.FromError(err)
    if st.Code() != codes.PermissionDenied {
        t.Fatalf("got %v, want PermissionDenied", st.Code())
    }
    if callCount != 1 {
        t.Fatalf("must not retry on PermissionDenied, got %d calls", callCount)
    }
}
```

The `noSleep()` option injects a no-op sleep function to keep tests
fast. Never use `time.Sleep` inside interceptor tests.

### Go: logging/tracing - metadata propagation

Per
[pkg.go.dev/google.golang.org/grpc/metadata#FromIncomingContext](https://pkg.go.dev/google.golang.org/grpc/metadata),
metadata keys are always lowercase. A logging interceptor reads
`x-trace-id` and `x-request-id` from incoming metadata and attaches
them to the logger context.

```go
func TestLoggingInterceptor_PropagatesTraceID(t *testing.T) {
    var capturedTraceID string
    spy := func(ctx context.Context, req any) (any, error) {
        // The interceptor must enrich ctx with trace ID before calling handler.
        capturedTraceID = traceIDFromContext(ctx) // your helper
        return "ok", nil
    }

    md := metadata.Pairs("x-trace-id", "trace-abc-123")
    ctx := metadata.NewIncomingContext(context.Background(), md)
    _, err := loggingInterceptor(ctx, nil, nil, spy)

    if err != nil {
        t.Fatal(err)
    }
    if capturedTraceID != "trace-abc-123" {
        t.Fatalf("trace ID not propagated: got %q", capturedTraceID)
    }
}
```

For client-side propagation use
`metadata.AppendToOutgoingContext` per
[pkg.go.dev/google.golang.org/grpc/metadata#AppendToOutgoingContext](https://pkg.go.dev/google.golang.org/grpc/metadata):

```go
ctx = metadata.AppendToOutgoingContext(ctx, "x-trace-id", traceID)
```

### Go: chained interceptor ordering

Per
[pkg.go.dev/google.golang.org/grpc#ChainUnaryInterceptor](https://pkg.go.dev/google.golang.org/grpc#ChainUnaryInterceptor),
the first interceptor passed to `grpc.ChainUnaryInterceptor` is the
outermost (called first). Test ordering explicitly when auth must
run before logging:

```go
func TestChainOrder_AuthBeforeLogging(t *testing.T) {
    var callOrder []string

    authInt := func(ctx context.Context, req any, info *grpc.UnaryServerInfo,
        handler grpc.UnaryHandler) (any, error) {
        callOrder = append(callOrder, "auth")
        return handler(ctx, req)
    }
    logInt := func(ctx context.Context, req any, info *grpc.UnaryServerInfo,
        handler grpc.UnaryHandler) (any, error) {
        callOrder = append(callOrder, "log")
        return handler(ctx, req)
    }

    // Build a chain and invoke it with a no-op handler.
    chained := chainUnary(authInt, logInt) // your thin wrapper around ChainUnaryInterceptor
    _, _ = chained(context.Background(), nil, nil,
        func(ctx context.Context, req any) (any, error) { return nil, nil })

    if callOrder[0] != "auth" || callOrder[1] != "log" {
        t.Fatalf("wrong order: %v", callOrder)
    }
}
```

### Go: streaming server interceptor

`grpc.StreamServerInterceptor` signature per
[pkg.go.dev/google.golang.org/grpc#StreamServerInterceptor](https://pkg.go.dev/google.golang.org/grpc#StreamServerInterceptor):

```go
type StreamServerInterceptor func(
    srv any,
    ss grpc.ServerStream,
    info *grpc.StreamServerInfo,
    handler grpc.StreamHandler,
) error
```

Test using a fake `grpc.ServerStream` that captures the metadata
header sent before the first message:

```go
type fakeStream struct {
    grpc.ServerStream
    ctx     context.Context
    headers metadata.MD
}

func (f *fakeStream) Context() context.Context { return f.ctx }
func (f *fakeStream) SendHeader(md metadata.MD) error {
    f.headers = md
    return nil
}

func TestStreamAuthInterceptor_MissingToken(t *testing.T) {
    fs := &fakeStream{ctx: context.Background()} // no metadata
    err := streamAuthInterceptor(nil, fs, nil, func(srv any, stream grpc.ServerStream) error {
        t.Fatal("handler must not be called")
        return nil
    })
    st, _ := status.FromError(err)
    if st.Code() != codes.Unauthenticated {
        t.Fatalf("got %v, want Unauthenticated", st.Code())
    }
}
```

### Java: ServerInterceptor - auth rejection

`ServerInterceptor.interceptCall` signature per
[grpc-java javadoc](https://grpc.github.io/grpc-java/javadoc/io/grpc/ServerInterceptor.html):

```java
<ReqT, RespT> ServerCall.Listener<ReqT> interceptCall(
    ServerCall<ReqT, RespT> call,
    Metadata headers,
    ServerCallHandler<ReqT, RespT> next)
```

Test with a `ServerCall` stub that captures the `close()` call:

```java
import io.grpc.*;
import org.junit.Test;
import static org.junit.Assert.*;
import static org.mockito.Mockito.*;

public class AuthInterceptorTest {

    private final ServerInterceptor interceptor = new AuthInterceptor();

    @SuppressWarnings("unchecked")
    @Test
    public void missingAuthHeader_closesWithUnauthenticated() {
        ServerCall<Object, Object> call = mock(ServerCall.class);
        Metadata headers = new Metadata(); // no authorization key
        ServerCallHandler<Object, Object> next = mock(ServerCallHandler.class);

        interceptor.interceptCall(call, headers, next);

        verify(call).close(
            argThat(s -> s.getCode() == Status.Code.UNAUTHENTICATED),
            any(Metadata.class));
        verifyNoInteractions(next);
    }
}
```

Registration per
[grpc-java javadoc ServerInterceptors.intercept](https://grpc.github.io/grpc-java/javadoc/io/grpc/ServerInterceptors.html)
- note `intercept()` applies interceptors in reverse order (last
interceptor's `interceptCall` fires first); use `interceptForward()`
to preserve declaration order:

```java
// Last-listed interceptor fires first:
ServerServiceDefinition def =
    ServerInterceptors.intercept(serviceImpl, authInterceptor, loggingInterceptor);

// First-listed interceptor fires first:
ServerServiceDefinition def =
    ServerInterceptors.interceptForward(serviceImpl, authInterceptor, loggingInterceptor);
```

### Java: ClientInterceptor - outbound token injection

`ClientInterceptor.interceptCall` signature per
[grpc-java javadoc](https://grpc.github.io/grpc-java/javadoc/io/grpc/ClientInterceptor.html):

```java
<ReqT, RespT> ClientCall<ReqT, RespT> interceptCall(
    MethodDescriptor<ReqT, RespT> method,
    CallOptions callOptions,
    Channel next)
```

Test that the interceptor attaches the `authorization` key to outbound
headers by capturing `Metadata` passed to `ClientCall.start()`:

```java
@Test
public void tokenInjector_attachesAuthorizationHeader() {
    ClientInterceptor interceptor = new TokenInjectorInterceptor("Bearer tok");
    Channel channel = mock(Channel.class);
    ClientCall<Object, Object> innerCall = mock(ClientCall.class);
    when(channel.newCall(any(), any())).thenReturn(innerCall);

    ClientCall<Object, Object> call =
        interceptor.interceptCall(methodDescriptor(), CallOptions.DEFAULT, channel);

    Metadata headers = new Metadata();
    call.start(mock(ClientCall.Listener.class), headers);

    String auth = headers.get(Metadata.Key.of("authorization", Metadata.ASCII_STRING_MARSHALLER));
    assertEquals("Bearer tok", auth);
}
```

### grpc-js: client interceptor

`@grpc/grpc-js` exposes client interceptors as a channel option. The
package README confirms "Client Interceptors" as a supported feature at
[github.com/grpc/grpc-node/tree/master/packages/grpc-js](https://github.com/grpc/grpc-node/tree/master/packages/grpc-js).
An interceptor is a function `(options, nextCall) => InterceptingCall`.

Test an auth-header injector by building an `InterceptingCall` with a
`RequesterBuilder` that captures the outbound metadata:

```typescript
import * as grpc from "@grpc/grpc-js";
import { InterceptingCall, InterceptorOptions, NextCall } from "@grpc/grpc-js";

function authInterceptor(token: string) {
    return (options: InterceptorOptions, nextCall: NextCall): InterceptingCall => {
        return new InterceptingCall(nextCall(options), {
            start(metadata, listener, next) {
                metadata.add("authorization", `Bearer ${token}`);
                next(metadata, listener);
            },
        });
    };
}

// Test using a spy on the nextCall layer
test("authInterceptor injects Authorization header", () => {
    let capturedMetadata: grpc.Metadata | undefined;

    const fakeNext: NextCall = (_options) =>
        new InterceptingCall(null as any, {
            start(metadata, _listener, _next) {
                capturedMetadata = metadata;
            },
        });

    const interceptorFn = authInterceptor("my-token");
    const call = interceptorFn({} as InterceptorOptions, fakeNext);
    call.start(new grpc.Metadata(), {} as grpc.Listener);

    expect(capturedMetadata?.get("authorization")).toEqual(["Bearer my-token"]);
});
```

Register on a channel:

```typescript
const client = new UserServiceClient(address, credentials, {
    interceptors: [authInterceptor("my-token")],
});
```

## Running

These tests run as ordinary unit tests in each language:

```bash
go test ./... -run TestAuth -race   # Go: -race catches metadata races
mvn test -Dtest=AuthInterceptorTest  # Java / Maven
npx jest --testPathPattern=interceptor  # Node / Jest
```

Use `-race` in Go: concurrent `ctx` + `metadata` access in interceptors
surfaces races that pass without the flag.

## CI integration

```yaml
jobs:
  interceptor-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-go@v5
        with: { go-version: stable }
      - run: go test ./... -race -count=1 -timeout=30s
```

`-count=1` disables the test cache so metadata-mutation tests are not
silently skipped on re-runs.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Asserting on error message strings | Text is not part of the gRPC contract; changes with i18n | Assert on `status.Code()` only |
| Testing the interceptor only via an end-to-end call | Chain bugs and ordering issues are invisible when everything succeeds | Call the interceptor function directly with a spy handler |
| Assuming `intercept()` and `interceptForward()` are identical | Java `ServerInterceptors.intercept()` applies interceptors in reverse order per the javadoc | Use `interceptForward()` when declaration order must match execution order |
| `time.Sleep` inside retry-interceptor tests | Slow tests; sleep duration is arbitrary | Inject a fake sleep function via an option or dependency parameter |
| Sharing a single metadata map across test cases | Map mutation bleeds between cases | Construct a fresh `metadata.MD` / `Metadata` per test |
| Not testing the "does not retry" case for non-transient codes | Retry interceptors that retry `PermissionDenied` cause auth-storm bugs | Add explicit tests for `codes.PermissionDenied` and `codes.InvalidArgument` |
| Embedding real tokens in test metadata | Secrets in source history | Use constant placeholder strings like `"Bearer test-token-value"` |

## Limitations

- **Does not cover wire-level fault injection.** For testing that an
  interceptor survives partial bytes or TCP resets, use a real network
  with toxiproxy.
- **Streaming interceptors need fake `ServerStream` / `ClientStream`
  implementations.** Minimal fakes satisfy most tests; complex
  multi-message sequences belong in
  `grpc-streaming-test-author`.
- **grpc-js server interceptors are not in scope.** The `@grpc/grpc-js`
  server does not expose a `ServerInterceptor` extension point in the
  same way the Java or Go servers do.
- **`grpc.ChainUnaryInterceptor` ordering only applies to the server.**
  Client chaining uses `grpc.WithChainUnaryInterceptor`; the two have
  the same semantics but different registration functions per
  [pkg.go.dev/google.golang.org/grpc](https://pkg.go.dev/google.golang.org/grpc).

## References

- gRPC interceptors guide (concepts + use-case list):
  [grpc.io/docs/guides/interceptors](https://grpc.io/docs/guides/interceptors/).
- Go type signatures (`UnaryServerInterceptor`, `StreamServerInterceptor`,
  `UnaryClientInterceptor`, `StreamClientInterceptor`, chain functions):
  [pkg.go.dev/google.golang.org/grpc](https://pkg.go.dev/google.golang.org/grpc).
- Go metadata API (`FromIncomingContext`, `AppendToOutgoingContext`):
  [pkg.go.dev/google.golang.org/grpc/metadata](https://pkg.go.dev/google.golang.org/grpc/metadata).
- Go status codes (`Unauthenticated=16`, `PermissionDenied=7`, `Unavailable=14`):
  [pkg.go.dev/google.golang.org/grpc/codes](https://pkg.go.dev/google.golang.org/grpc/codes).
- Java `ServerInterceptor.interceptCall` signature:
  [grpc.github.io/grpc-java/javadoc/io/grpc/ServerInterceptor.html](https://grpc.github.io/grpc-java/javadoc/io/grpc/ServerInterceptor.html).
- Java `ClientInterceptor.interceptCall` signature:
  [grpc.github.io/grpc-java/javadoc/io/grpc/ClientInterceptor.html](https://grpc.github.io/grpc-java/javadoc/io/grpc/ClientInterceptor.html).
- Java `ServerInterceptors.intercept` vs `interceptForward` ordering:
  [grpc.github.io/grpc-java/javadoc/io/grpc/ServerInterceptors.html](https://grpc.github.io/grpc-java/javadoc/io/grpc/ServerInterceptors.html).
- grpc-js client interceptors (supported feature listing):
  [github.com/grpc/grpc-node/tree/master/packages/grpc-js](https://github.com/grpc/grpc-node/tree/master/packages/grpc-js).
- Status code assertions:
  `grpc-status-code-mapping-reference`.
- In-process server setup (when testing interceptor + handler together):
  `grpc-mock`.
- Streaming handler tests:
  `grpc-streaming-test-author`.
