---
name: grpc-interceptor-test-author
description: "Authors unit tests for gRPC interceptor logic: Go grpc.UnaryServerInterceptor/UnaryClientInterceptor, Java ServerInterceptor/ClientInterceptor, and grpc-js client interceptors. Covers auth (Unauthenticated on bad token), retry (backoff on Unavailable), logging/tracing (metadata extraction + propagation), error-mapping (status translation), and chained interceptor ordering - by calling the interceptor directly with a spy handler, no live backend. Use when a gRPC interceptor is written or modified. Different test surface from grpc-streaming-test-author (multi-message stream sequences) and grpc-mock (service handler logic) - use those, not this, for streams or handlers."
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

Full type signatures are at the reference links in each language playbook.

## Authoring strategy: call the interceptor directly

The canonical test pattern for all languages is:

1. Construct the interceptor function/object directly.
2. Invoke it with a crafted context/metadata and a spy or stub `handler`
   (the `next` leg in the chain).
3. Assert on: what the handler received, what status code was returned,
   and what metadata was set.

This avoids spinning up a full in-process server just to test
cross-cutting logic. Use the in-process server from `grpc-mock` only
when testing the *interaction* between an interceptor and a handler.

## Language playbooks

Each playbook holds the full type signatures, test patterns, and runnable
examples for one language surface:

- Go - server/client unary, retry with fake clock, logging/tracing metadata
  propagation, chained ordering, streaming server interceptor:
  [references/go-interceptors.md](references/go-interceptors.md).
- Java - `ServerInterceptor` auth rejection, `ClientInterceptor` outbound token
  injection, `intercept()` vs `interceptForward()` ordering:
  [references/java-interceptors.md](references/java-interceptors.md).
- grpc-js - client interceptor auth-header injection via `InterceptingCall`:
  [references/grpc-js-interceptors.md](references/grpc-js-interceptors.md).

## How to use

1. Identify the interceptor under test and its variant (server/client,
   unary/streaming) using the taxonomy table.
2. Open the matching language playbook (Go, Java, or grpc-js).
3. Construct the interceptor directly and craft the input context/metadata for
   the behavior under test (auth, retry, logging, error-mapping, ordering).
4. Wire a spy/stub `handler` (the `next` leg) that records what it received and
   whether it was called at all.
5. Invoke the interceptor and assert on status code, handler invocation count,
   and set/propagated metadata - never on error message strings.
6. Add the negative case (e.g., a non-transient code must not be retried) and a
   fresh metadata map per test to prevent bleed.
7. Run with the language's isolation flags (`-race`, `-count=1`) and wire into CI.

## Worked example

Scenario: a Go client retry interceptor must retry transient failures but never
retry an auth failure.

1. Under test: `retryInterceptor(maxRetries(3), noSleep())`, a
   `grpc.UnaryClientInterceptor`.
2. Craft a spy `invoker` that returns `codes.Unavailable` on the first two calls
   and `nil` on the third, incrementing `callCount` each time.
3. Invoke the interceptor with `context.Background()` and the spy; assert
   `err == nil` and `callCount == 3` - it retried twice, then succeeded.
4. Add the negative case: a spy `invoker` that always returns
   `codes.PermissionDenied`; assert `st.Code() == codes.PermissionDenied` and
   `callCount == 1` - a non-transient code is surfaced immediately, not retried.
5. Run `go test ./... -run TestRetry -race -count=1`. Result: two passing tests
   proving backoff fires on Unavailable and is skipped on PermissionDenied, with
   no auth-storm regression.

Full code for both tests is in
[references/go-interceptors.md](references/go-interceptors.md).

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
