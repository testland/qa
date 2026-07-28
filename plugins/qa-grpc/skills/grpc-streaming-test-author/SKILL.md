---
name: grpc-streaming-test-author
description: "Workflow-driven skill that builds gRPC streaming-RPC test suites from a proto definition. Classifies each RPC by pattern (unary, server-streaming, client-streaming, bidi), then emits the required categories per pattern - ordering preservation, completion semantics (server close after stream end, client half-close), cancellation, deadline handling, partial-stream failure. Produces skeletons for Go (bufconn + Send/Recv), Python (iterators), JVM (StreamObserver), Node (call.write/end). Use when adding tests for a new streaming RPC or auditing a suite for uncovered categories. Different test surface from grpc-interceptor-test-author (interceptor layer) and grpc-mock (harness); for wire-level streaming semantics use grpc-streaming-tests, not this."
---

# grpc-streaming-test-author

## Overview

Streaming RPCs are where gRPC clients and servers most often
diverge from the proto contract - message ordering, completion
signalling, cancellation, and partial-failure semantics are all
testable surfaces. gRPC defines four streaming patterns - unary,
server-streaming, client-streaming, bidirectional - per
[grpc.io/docs/what-is-grpc/core-concepts/](https://grpc.io/docs/what-is-grpc/core-concepts/);
Step 1 classifies each RPC by pattern.

This skill walks through producing a comprehensive test suite
from the proto file. It composes
`grpc-mock` for the test harness and
`grpc-status-code-mapping-reference`
for status-code assertions.

## When to use

- Adding tests for a new streaming RPC.
- Auditing an existing streaming-RPC test suite - is each
  pattern's required category covered?
- Investigating a streaming-RPC bug - minimal repro from the
  test matrix.
- PR review of changes to streaming RPCs (the
  `protobuf-versioning-strategy-reference`
  rules on `stream` changes are subtle).

## Step 1 - Classify each RPC

Walk the `.proto` file and tabulate:

```proto
service Chat {
  rpc Send(Message) returns (Ack);                         // unary
  rpc Subscribe(SubReq) returns (stream Event);            // server streaming
  rpc Upload(stream Chunk) returns (UploadResult);         // client streaming
  rpc Conversation(stream Message) returns (stream Reply); // bidi
}
```

| RPC | Pattern | Required test categories |
|---|---|---|
| `Send` | unary | success, every status code per `grpc-status-code-mapping-reference` |
| `Subscribe` | server-stream | success, ordering, server-side close after N messages, server-side mid-stream error, client-side cancel mid-stream, deadline-exceeded mid-stream |
| `Upload` | client-stream | success, server completes before client finishes, server-side error mid-upload, client-side cancel before send, empty stream |
| `Conversation` | bidi | success, ordering per direction, client closes send while still receiving, server closes send while still receiving, both close, deadline mid-conversation, error mid-conversation |

## Step 2 - Test categories per pattern

### Unary (covered for completeness)

```python
def test_send_returns_ok(stub):
    resp = stub.Send(Message(body="hi"))
    assert resp.ok

def test_send_returns_invalid_argument(stub):
    with pytest.raises(grpc.RpcError) as exc:
        stub.Send(Message(body=""))
    assert exc.value.code() == grpc.StatusCode.INVALID_ARGUMENT
```

### Server-streaming

**Ordering preservation** - per gRPC docs: "gRPC guarantees
message ordering within an individual RPC call."

```python
def test_subscribe_preserves_ordering(stub_with_fake):
    stub_with_fake.fake_response_stream = [
        Event(seq=1), Event(seq=2), Event(seq=3),
    ]
    received = list(stub_with_fake.Subscribe(SubReq()))
    assert [e.seq for e in received] == [1, 2, 3]
```

**Server closes after N messages** - completion is the
finalisation signal:

```python
def test_subscribe_completes_after_finite_stream(stub_with_fake):
    stub_with_fake.fake_response_stream = [Event(seq=1), Event(seq=2)]
    events = list(stub_with_fake.Subscribe(SubReq()))
    # If list(...) terminates, the server-side close was signalled.
    assert len(events) == 2
```

**Server-side error mid-stream**:

```python
def test_subscribe_propagates_error_mid_stream(stub_with_fake):
    stub_with_fake.fake_response_stream = [Event(seq=1)]
    stub_with_fake.fake_post_yield_status = grpc.StatusCode.INTERNAL
    events_iter = stub_with_fake.Subscribe(SubReq())
    # Receive first event OK
    next(events_iter)
    # Subsequent receive fails with INTERNAL per grpc-status-code-mapping-reference
    with pytest.raises(grpc.RpcError) as exc:
        next(events_iter)
    assert exc.value.code() == grpc.StatusCode.INTERNAL
```

**Client cancel mid-stream**:

```python
def test_client_cancel_mid_stream(stub_with_fake):
    stub_with_fake.fake_response_stream = [Event(seq=i) for i in range(100)]
    events_iter = stub_with_fake.Subscribe(SubReq())
    next(events_iter)  # receive one
    events_iter.cancel()
    with pytest.raises(grpc.RpcError) as exc:
        next(events_iter)
    assert exc.value.code() == grpc.StatusCode.CANCELLED
```

**Deadline-exceeded mid-stream**:

```python
def test_subscribe_deadline_exceeded(stub_with_slow_fake):
    events_iter = stub_with_slow_fake.Subscribe(SubReq(), timeout=0.1)
    with pytest.raises(grpc.RpcError) as exc:
        for _ in events_iter:
            pass
    assert exc.value.code() == grpc.StatusCode.DEADLINE_EXCEEDED
```

### Client-streaming

Categories: success, server completes before client finishes (further
`Send` yields `io.EOF`), server-side error mid-upload, client-side
cancel before send, empty stream. Go bufconn skeletons:
[references/test-skeletons.md](references/test-skeletons.md).

### Bidirectional

The two streams operate independently, so test each direction plus a
concurrent send/recv case. Categories: ordering per direction, client
closes send while still receiving (`CloseSend`), server closes send
while still receiving, both close, deadline mid-conversation, error
mid-conversation. Go skeletons:
[references/test-skeletons.md](references/test-skeletons.md).

## Step 3 - Coverage matrix

For each streaming RPC, generate the matrix:

```
                              Send  Subscribe  Upload  Conversation
                              ----  ---------  ------  ------------
success                        X       X        X         X
ordering preserved             -       X        X         X (both)
N msgs then close              -       X        X         X
mid-stream server error        -       X        X         X
deadline exceeded              X       X        X         X
client cancel                  X       X        X         X
server cancel                  -       X        X         X
empty stream                   -       X        X         X
client half-close              -       -        -         X
server half-close              -       -        -         X
```

Empty cells in covered patterns = coverage gap. PR must justify
or add a test.

## Step 4 - Pick the test harness

Per `grpc-mock`:

| Language | Harness |
|---|---|
| Go | `bufconn` in-process server + `t.Cleanup` |
| Python | `pytest` fixture with `[::]:0` port + iterator-based stream API |
| JVM | `InProcessServerBuilder` + `StreamObserver` |
| Node | `@grpc/grpc-js` server with `bindAsync("127.0.0.1:0")` + `call.write` / `call.end` |

Don't use `mockgen` / interface-mocks for streaming - they skip
the marshalling + ordering guarantees that the streaming
contract depends on.

## Step 5 - Emit the test directory

```
tests/grpc-streaming/
  __init__.py
  conftest.py                   # shared fixtures (in-process server)
  test_subscribe.py             # server-streaming
  test_upload.py                # client-streaming
  test_conversation.py          # bidi
  test_send.py                  # unary (sibling)
  README.md                     # the coverage matrix
```

The `README.md` should document the matrix from Step 3 so
reviewers and new contributors can see at a glance what is and
isn't covered.

## Streaming evolution - version-safety reminder

Per
`protobuf-versioning-strategy-reference`,
changing an RPC's streaming pattern is **always breaking**:

```diff
service Chat {
-  rpc Subscribe(SubReq) returns (Event);
+  rpc Subscribe(SubReq) returns (stream Event);
}
```

The wire format differs, so old clients won't parse the new
response. Verify breaking-change detection via
`buf-cli-lint-breaking-build`
catches this with `FILE` or `PACKAGE` category.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Single happy-path test per streaming RPC | Misses ordering / cancellation / deadline categories | Use Step 2's per-pattern matrix |
| Test asserts on the last message only | Misses ordering bugs in earlier messages | Collect entire stream, assert on the full sequence |
| `time.sleep` to wait for server messages | Race-prone; flakes in CI | Use channel close / iterator exhaustion as completion signal |
| Cancellation test sleeps then cancels | Race: server may finish before cancel | Inject a controllable blocker in the fake server |
| No deadline-exceeded test | Production deadlines surface in mid-stream | Always include - per `grpc-status-code-mapping-reference`, `DEADLINE_EXCEEDED` is its own code |
| Mock at interface level for streaming | Skips marshalling + ordering | In-process server only for streaming |
| Bidi test where client and server are deterministic-interleaved | Misses race conditions inherent in "operate independently" | One test per direction + one test with concurrent send/recv |
| Don't `CloseSend()` in client-streaming tests | Server waits forever | Always close the send side explicitly |

## Limitations

- **Wire-level fault injection.** Partial-byte cutoffs and
  middlebox-induced disconnects aren't reachable through
  bufconn / InProcessServer. For these, use toxiproxy + a real
  server.
- **Backpressure semantics differ per stack.** Go bufconn buffer
  size affects when `Send` blocks; Java `StreamObserver` is
  push-based; Python is iterator-pull. Tests are stack-specific.
- **HTTP/2 flow control isn't exercised.** In-process transports
  skip H2 framing; flow-control bugs need real transports.
- **Doesn't test contract compliance.** Mocks reflect what *this
  test* expects. Real-server contract tests are separate; see
  `protobuf-compat-checking` (in the qa-contract-testing plugin).
- **Concurrent-client stress tests not in scope.** For that see
  `ghz-load` (unary load) or hand-rolled
  multi-client streaming harnesses.

## References

- gRPC core concepts (four streaming patterns):
  [grpc.io/docs/what-is-grpc/core-concepts/](https://grpc.io/docs/what-is-grpc/core-concepts/).
- Status-code assertions:
  `grpc-status-code-mapping-reference`.
- Test harness:
  `grpc-mock`.
- Proto evolution rules:
  `protobuf-versioning-strategy-reference`.
- Breaking-change detection:
  `buf-cli-lint-breaking-build`.
- Sibling wire-level streaming patterns:
  `grpc-streaming-tests`.
