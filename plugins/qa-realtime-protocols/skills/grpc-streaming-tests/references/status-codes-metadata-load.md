# gRPC status codes, metadata, and load testing

Cross-cutting call semantics beyond the four streaming patterns: the full
status-code matrix, request/response metadata round-trip, and load testing
with `ghz`.

## Status codes

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

## Metadata

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

## Load test with `ghz`

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

[gRPC core concepts docs]: https://grpc.io/docs/what-is-grpc/core-concepts/
