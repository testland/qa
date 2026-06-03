---
name: grpc-streaming-tests
description: "Test gRPC streaming RPCs - Server-streaming (server returns sequence), Client-streaming (client sends sequence), Bidirectional (both sides stream independently). Cover deadline + cancellation + flow control + status codes (CANCELLED, DEADLINE_EXCEEDED) + metadata. Use ghz for load, grpcurl for ad-hoc, language-native test stubs for unit/integration."
type: skill
rating: 23
d6: 4
keywords:
  - grpc
  - streaming
  - rpc-testing
  - protobuf
  - realtime-protocols
---

# grpc-streaming-tests

Streaming RPCs need test coverage for deadline behavior,
cancellation propagation, flow control under backpressure, and
status-code semantics that differ from unary calls - covering all
four patterns (Unary, Server-streaming, Client-streaming,
Bidirectional-streaming) per the [gRPC core concepts docs].

## When to use

- Service exposes streaming RPCs (price ticker, log tail, IoT
  telemetry, AI streaming inference).
- Pre-deploy gate: deadline + cancellation propagate correctly,
  partial-stream errors return correct status codes.
- Load test gate: streams handle backpressure without OOM or
  silent drops.

## Step 1 - Pick the test tool

| Tool | Strength |
|---|---|
| Language-native stubs (Go `grpc.WithBlock()`, Python `grpc.aio`, Java `ManagedChannel`) | Unit/integration tests |
| `grpcurl` | Ad-hoc + smoke tests + scripts |
| `ghz` | Load testing + benchmarks (concurrency, RPS) |
| `mockgrpc` / `mockery` (Go), `grpc-mock` (Node) | Mock server stubs in unit tests |

## Step 2 - Unary RPC sanity (baseline)

Per the [gRPC core concepts docs], Unary = "single request, single
response." Use this to verify the RPC plumbing before testing
streams:

```python
import grpc
from orders_pb2 import OrderRequest
from orders_pb2_grpc import OrdersStub

def test_unary_create_order():
    with grpc.insecure_channel("localhost:50051") as ch:
        stub = OrdersStub(ch)
        resp = stub.CreateOrder(OrderRequest(item_count=2), timeout=5.0)
        assert resp.order_id != ""
```

## Step 3 - Server-streaming test

Per the [gRPC core concepts docs], server-streaming = "client sends
a request and gets a stream to read a sequence of messages back."

```python
def test_server_streaming_price_ticker():
    with grpc.insecure_channel("localhost:50051") as ch:
        stub = PricesStub(ch)
        stream = stub.SubscribePrices(SubscribeRequest(symbol="AAPL"), timeout=10.0)
        ticks = []
        for tick in stream:
            ticks.append(tick)
            if len(ticks) >= 5:
                stream.cancel()
                break

        assert len(ticks) == 5
        assert all(t.symbol == "AAPL" for t in ticks)
```

## Step 4 - Client-streaming test

Per the [gRPC core concepts docs], client-streaming = "client writes
a sequence of messages and sends them to the server."

```python
def test_client_streaming_upload():
    def chunks():
        for i in range(10):
            yield UploadChunk(seq=i, data=b"x" * 1024)

    with grpc.insecure_channel("localhost:50051") as ch:
        stub = UploadsStub(ch)
        resp = stub.Upload(chunks(), timeout=10.0)

        assert resp.total_chunks == 10
        assert resp.total_bytes == 10 * 1024
```

## Step 5 - Bidirectional streaming + ordering

Per the [gRPC core concepts docs], bidirectional streams "operate
independently" - server may emit messages before reading any client
message, after, or interleaved.

```python
import asyncio

async def test_bidi_chat():
    async def client_messages():
        for msg in ["hello", "how are you", "bye"]:
            yield ChatMessage(text=msg)
            await asyncio.sleep(0.1)

    async with grpc.aio.insecure_channel("localhost:50051") as ch:
        stub = ChatStub(ch)
        responses = []
        async for resp in stub.Chat(client_messages()):
            responses.append(resp)

        assert len(responses) >= 3
```

## Step 6 - Deadline propagation

Per the [gRPC core concepts docs], "Clients specify maximum wait
time; RPCs terminate with `DEADLINE_EXCEEDED` if exceeded."

```python
def test_deadline_returns_correct_status():
    with grpc.insecure_channel("localhost:50051") as ch:
        stub = SlowStub(ch)
        with pytest.raises(grpc.RpcError) as exc_info:
            stub.SlowOperation(SlowRequest(), timeout=0.5)

        assert exc_info.value.code() == grpc.StatusCode.DEADLINE_EXCEEDED
```

Verify the server-side:

```python
def test_server_observes_deadline_propagation():
    # Service should respect deadline and cancel its own downstream calls
    with grpc.insecure_channel("localhost:50051") as ch:
        stub = OrchestratorStub(ch)
        with pytest.raises(grpc.RpcError):
            stub.Compose(ComposeRequest(), timeout=0.1)

    # Verify downstream call observed the cancellation
    downstream_state = fetch_downstream_state()
    assert downstream_state.cancelled_count >= 1
```

## Step 7 - Cancellation behavior

Per the [gRPC core concepts docs], "Either party can terminate an
RPC immediately. Changes made before a cancellation are not rolled
back."

```python
def test_cancellation_is_observed_server_side():
    with grpc.insecure_channel("localhost:50051") as ch:
        stub = LongRunningStub(ch)
        future = stub.LongOperation.future(LongRequest())
        time.sleep(0.5)
        future.cancel()

        # Server should record cancellation
        time.sleep(0.5)
        state = fetch_server_metrics()
        assert state.cancelled_count >= 1
```

## Step 8 - Status codes

| Code | When |
|---|---|
| OK | Success |
| CANCELLED | Client cancelled |
| DEADLINE_EXCEEDED | Deadline elapsed |
| INVALID_ARGUMENT | Client error in request |
| UNAUTHENTICATED | No / bad credentials |
| PERMISSION_DENIED | Authenticated but not authorized |
| RESOURCE_EXHAUSTED | Quota / rate limit |
| INTERNAL | Server bug |
| UNAVAILABLE | Server transient unreachable (clients should retry) |

Test the error path returns the right code, not just "an error":

```python
def test_invalid_argument_returns_correct_code():
    with grpc.insecure_channel("localhost:50051") as ch:
        stub = OrdersStub(ch)
        with pytest.raises(grpc.RpcError) as exc:
            stub.CreateOrder(OrderRequest(item_count=-1))
        assert exc.value.code() == grpc.StatusCode.INVALID_ARGUMENT
```

## Step 9 - Metadata

Per the [gRPC core concepts docs], metadata is "key-value pairs"
case-insensitive ASCII keys; binary values use `-bin` suffix.

```python
def test_request_metadata_round_trip():
    with grpc.insecure_channel("localhost:50051") as ch:
        stub = OrdersStub(ch)
        metadata = (("x-trace-id", "abc123"),)
        resp, call = stub.CreateOrder.with_call(OrderRequest(), metadata=metadata)

        # Server reflects request-id in response trailing metadata
        trailing = call.trailing_metadata()
        assert ("x-trace-id-echo", "abc123") in trailing
```

## Step 10 - Load test with `ghz`

```bash
ghz \
  --insecure \
  --proto orders.proto \
  --call orders.Orders/CreateOrder \
  -d '{"item_count":1}' \
  -c 50 \
  -n 10000 \
  localhost:50051
```

Reports RPS, p50/p95/p99 latency. For streaming RPCs use
`--stream-call-count` flag (consult ghz docs).

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Skip deadline + cancellation tests | Production cancellation orphans server-side work | Steps 6 + 7 |
| Test only OK and INTERNAL paths | Status-code regressions go silently | Test the matrix (Step 8) |
| Use BatchSpanProcessor or similar buffering on test client | Streams "complete" before all messages flush | Always synchronous in tests |
| Tests share a single channel across goroutines | Channel state contamination flakes | Per-test channel |
| Generate proto stubs at test runtime | CI flakes on plugin churn | Generate in build phase + commit |

## Limitations

- gRPC-Web uses HTTP/1.1 fallback; some streaming patterns
  (client/bidi) are not supported. Test gRPC-Web specifically if
  used.
- Long-lived bidi streams hide individual-message error codes;
  channel-level state matters more.
- ghz protobuf reflection requires the server to enable reflection
  service (not always on in production builds).

## References

- [gRPC core concepts docs] - RPC patterns, deadlines, cancellation,
  status codes, metadata
- [`websocket-tests`](../websocket-tests/SKILL.md) - WebSocket
  alternative for non-gRPC stacks
- [`server-sent-events-tests`](../server-sent-events-tests/SKILL.md) - 
  one-way HTTP streaming alternative

[gRPC core concepts docs]: https://grpc.io/docs/what-is-grpc/core-concepts/
