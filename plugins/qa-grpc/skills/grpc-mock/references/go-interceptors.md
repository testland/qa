# Go interceptor tests

All Go examples construct the interceptor function directly and invoke it with a
spy handler (the `next` leg). No live backend. Always assert on `status.Code()`,
never on error message strings (message text is not part of the gRPC contract).

## Auth interceptor - rejects bad token

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

## Retry interceptor - exponential backoff on Unavailable

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

## Logging/tracing - metadata propagation

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

## Chained interceptor ordering

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

## Streaming server interceptor

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
