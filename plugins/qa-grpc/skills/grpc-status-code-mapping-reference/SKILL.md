---
name: grpc-status-code-mapping-reference
description: "Pure-reference catalog of gRPC standard status codes - the 17 canonical codes (OK..UNAUTHENTICATED), their numeric values, semantics, retry behaviour per AIP-194 (only UNAVAILABLE is auto-retry-safe), and the gRPC-to-HTTP status mapping used by grpc-gateway (NOT_FOUND→404, INVALID_ARGUMENT→400, PERMISSION_DENIED→403, UNAUTHENTICATED→401, RESOURCE_EXHAUSTED→429, FAILED_PRECONDITION→400 not 412, ABORTED→409, UNAVAILABLE→503, DEADLINE_EXCEEDED→504, etc.). Use when designing a gRPC service's error vocabulary, writing assertions in gRPC client tests, configuring retry policies, or mapping gRPC errors to HTTP via a gateway. Consumed by buf-cli-lint-breaking-build, ghz-load, grpcurl-cli, grpc-mock, grpc-streaming-test-author."
---

# grpc-status-code-mapping-reference

## Overview

gRPC defines 17 standard status codes (per
[grpc.io/docs/guides/status-codes/](https://grpc.io/docs/guides/status-codes/))
that every implementation respects. They are the wire-level
error vocabulary; using the wrong code breaks retry behaviour,
HTTP gateway translation, and observability dashboards.

Three things to get right:

1. **The semantic meaning** - OK..UNAUTHENTICATED have specific
   definitions; picking the wrong one mis-signals to clients.
2. **The retry behaviour** - per [AIP-194](https://google.aip.dev/194),
   only `UNAVAILABLE` is generally safe to auto-retry.
3. **The HTTP mapping** - per
   [grpc-gateway runtime/errors.go](https://github.com/grpc-ecosystem/grpc-gateway/blob/main/runtime/errors.go),
   `FAILED_PRECONDITION → 400 Bad Request` (NOT 412
   "Precondition Failed" despite the name).

This skill is a **pure reference** consumed by client-test
authors, server implementers, and the gRPC-to-HTTP gateway
configurators.

## When to use

- Designing the error vocabulary of a new gRPC service.
- Writing client-test assertions: which status should the test
  expect?
- Configuring a retry policy in the gRPC client.
- Mapping gRPC errors to HTTP in a `grpc-gateway` setup.
- PR review - is this `status.Errorf` call using the right code?

## The canonical 17 codes

Per
[grpc.io/docs/guides/status-codes/](https://grpc.io/docs/guides/status-codes/):

| # | Code | Definition (gRPC docs) | Typical example |
|---|---|---|---|
| 0 | `OK` | "Not an error; returned on success." | Successful RPC |
| 1 | `CANCELLED` | "The operation was cancelled, typically by the caller." | Client terminates stream |
| 2 | `UNKNOWN` | "Unknown error... errors raised by APIs that do not return enough error information." | Wrapping a non-gRPC error |
| 3 | `INVALID_ARGUMENT` | "The client specified an invalid argument... problematic regardless of the state of the system." | Malformed request payload |
| 4 | `DEADLINE_EXCEEDED` | "The deadline expired before the operation could complete... even if the operation has completed successfully." | Server slow + deadline expired |
| 5 | `NOT_FOUND` | "Some requested entity (e.g., file or directory) was not found." | Resource doesn't exist |
| 6 | `ALREADY_EXISTS` | "The entity that a client attempted to create already exists." | Duplicate unique key |
| 7 | `PERMISSION_DENIED` | "The caller does not have permission to execute the specified operation." | Authenticated but unauthorised |
| 8 | `RESOURCE_EXHAUSTED` | "Some resource has been exhausted, perhaps a per-user quota." | Rate limit hit |
| 9 | `FAILED_PRECONDITION` | "System is not in a state required for the operation's execution... client should not retry until the system state has been explicitly fixed." | Delete non-empty bucket |
| 10 | `ABORTED` | "The operation was aborted, typically due to a concurrency issue such as a sequencer check failure or transaction abort." | Optimistic-locking conflict |
| 11 | `OUT_OF_RANGE` | "The operation was attempted past the valid range... problem that may be fixed if the system state changes." | Seek past EOF |
| 12 | `UNIMPLEMENTED` | "The operation is not implemented or is not supported/enabled in this service." | Method not in this version |
| 13 | `INTERNAL` | "Internal errors... invariants expected by the underlying system have been broken." | Database corruption |
| 14 | `UNAVAILABLE` | "The service is currently unavailable... most likely a transient condition, which can be corrected by retrying with a backoff." | Backend restarting |
| 15 | `DATA_LOSS` | "Unrecoverable data loss or corruption." | Storage volume failed |
| 16 | `UNAUTHENTICATED` | "The request does not have valid authentication credentials for the operation." | Missing JWT |

## Retry behaviour

Per [AIP-194](https://google.aip.dev/194):

| Code | Retry? | Notes |
|---|---|---|
| `OK` | n/a | Success |
| `CANCELLED` | **No** | Client requested cancellation; honour it |
| `UNKNOWN` | **No** | Unsafe; retrying may compound state |
| `INVALID_ARGUMENT` | **No** | Argument won't change |
| `DEADLINE_EXCEEDED` | **No** | Application deadline must be respected |
| `NOT_FOUND` | **No** | Requires state change |
| `ALREADY_EXISTS` | **No** | Requires state change |
| `PERMISSION_DENIED` | **No** | Requires permission change |
| `RESOURCE_EXHAUSTED` | **Maybe** | Quota may take hours; consider billing |
| `FAILED_PRECONDITION` | **No** | "Client should not retry until the system state has been explicitly fixed" (gRPC docs) |
| `ABORTED` | **Application-level** | "Retry at the transaction level, not individual request level" |
| `OUT_OF_RANGE` | **No** | Requires state change |
| `UNIMPLEMENTED` | **No** | Method doesn't exist |
| `INTERNAL` | **No** | Surface bugs immediately |
| `UNAVAILABLE` | **Yes** | "The only error code explicitly recommended for automatic retry" per AIP-194 |
| `DATA_LOSS` | **No** | Unrecoverable; surface immediately |
| `UNAUTHENTICATED` | **No** | Re-auth first, then retry application-level |

### Client-side retry policy

```json
{
  "methodConfig": [{
    "name": [{"service": "example.v1.UserService"}],
    "retryPolicy": {
      "maxAttempts": 4,
      "initialBackoff": "0.1s",
      "maxBackoff": "1s",
      "backoffMultiplier": 2,
      "retryableStatusCodes": ["UNAVAILABLE"]
    }
  }]
}
```

Adding `RESOURCE_EXHAUSTED` to `retryableStatusCodes` is sometimes
seen but per AIP-194 has billing implications.

## gRPC ↔ HTTP mapping (grpc-gateway)

Per
[grpc-gateway/runtime/errors.go](https://github.com/grpc-ecosystem/grpc-gateway/blob/main/runtime/errors.go):

| gRPC code | HTTP status | Notes |
|---|---|---|
| `OK` | 200 | Standard success |
| `CANCELLED` | **499** | Client Closed Request (nginx-originated, non-standard) |
| `UNKNOWN` | 500 | Internal Server Error |
| `INVALID_ARGUMENT` | 400 | Bad Request |
| `DEADLINE_EXCEEDED` | 504 | Gateway Timeout |
| `NOT_FOUND` | 404 | Not Found |
| `ALREADY_EXISTS` | 409 | Conflict |
| `PERMISSION_DENIED` | 403 | Forbidden |
| `UNAUTHENTICATED` | 401 | Unauthorized |
| `RESOURCE_EXHAUSTED` | 429 | Too Many Requests |
| `FAILED_PRECONDITION` | **400** | Bad Request - **NOT** 412 "Precondition Failed" despite the name. grpc-gateway code comment: "deliberately doesn't translate to the similarly named '412 Precondition Failed'" |
| `ABORTED` | 409 | Conflict (concurrency) |
| `OUT_OF_RANGE` | 400 | Bad Request |
| `UNIMPLEMENTED` | 501 | Not Implemented |
| `INTERNAL` | 500 | Internal Server Error |
| `UNAVAILABLE` | 503 | Service Unavailable |
| `DATA_LOSS` | 500 | Internal Server Error |

### Implications for HTTP clients

- `UNAUTHENTICATED` (401) vs `PERMISSION_DENIED` (403) - same
  distinction as plain HTTP.
- `INVALID_ARGUMENT`, `FAILED_PRECONDITION`, `OUT_OF_RANGE` all
  → 400; the gRPC code carries the semantic distinction.
- `INTERNAL`, `UNKNOWN`, `DATA_LOSS` all → 500.
- HTTP 499 (Cancelled) is **non-standard**; some HTTP clients
  don't handle it.

## Choosing the right code - disambiguators

The hardest pairs:

### INVALID_ARGUMENT vs FAILED_PRECONDITION vs OUT_OF_RANGE

| Question | Answer |
|---|---|
| Is the arg malformed regardless of system state? | `INVALID_ARGUMENT` |
| Is the arg valid but the system isn't in the right state? | `FAILED_PRECONDITION` |
| Is the arg past a valid range that may shift over time? | `OUT_OF_RANGE` |

Per gRPC docs: `FAILED_PRECONDITION` "client should not retry";
`OUT_OF_RANGE` "may be fixed if the system state changes."

### FAILED_PRECONDITION vs ABORTED vs UNAVAILABLE

| Question | Answer |
|---|---|
| Concurrency conflict (transaction abort, sequencer check)? | `ABORTED` |
| System needs state change before retry? | `FAILED_PRECONDITION` |
| System transient unavailability? | `UNAVAILABLE` |

Per AIP-194: `ABORTED` retries at the **transaction** level, not
the request level. `UNAVAILABLE` retries at the **request** level.

### NOT_FOUND vs UNIMPLEMENTED

| Question | Answer |
|---|---|
| Resource doesn't exist at this point in time? | `NOT_FOUND` |
| Method doesn't exist in this server version? | `UNIMPLEMENTED` |

### UNKNOWN vs INTERNAL

| Question | Answer |
|---|---|
| Server caught a non-gRPC error and is wrapping it? | `UNKNOWN` |
| Server detected its own invariant violation? | `INTERNAL` |

`UNKNOWN` is for upstream noise; `INTERNAL` is for "I detected
something wrong with me."

## Tests should assert these codes

In client tests (per [`grpcurl-cli`](../grpcurl-cli/SKILL.md) and
language-specific clients):

```python
import grpc
import pytest

def test_get_user_not_found_returns_not_found(stub):
    with pytest.raises(grpc.RpcError) as exc_info:
        stub.GetUser(GetUserRequest(id="nonexistent"))
    assert exc_info.value.code() == grpc.StatusCode.NOT_FOUND

def test_create_user_with_duplicate_email_returns_already_exists(stub, existing_user):
    with pytest.raises(grpc.RpcError) as exc_info:
        stub.CreateUser(CreateUserRequest(email=existing_user.email))
    assert exc_info.value.code() == grpc.StatusCode.ALREADY_EXISTS

def test_unauthenticated_call_returns_unauthenticated(stub_no_auth):
    with pytest.raises(grpc.RpcError) as exc_info:
        stub_no_auth.GetUser(GetUserRequest(id="any"))
    assert exc_info.value.code() == grpc.StatusCode.UNAUTHENTICATED
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Returning `INTERNAL` for caller-side errors | Surfaces server bugs that don't exist; alarms fire | Use `INVALID_ARGUMENT` for bad inputs |
| Returning `UNKNOWN` everywhere | No retry semantics, no HTTP mapping clarity | Pick the specific code |
| Returning `FAILED_PRECONDITION` for transient unavailability | Clients don't retry → user-visible failures | Use `UNAVAILABLE` |
| Using `NOT_FOUND` for "you don't have permission" | Information leak (tenant probes) - OR - opacity (debugging hard); document the choice | Per [`tenant-leak-test-author`](../../../qa-multi-tenancy/skills/tenant-leak-test-author/SKILL.md) the 404-vs-403 trade-off is project policy |
| `OK` with error message in payload | Breaks every gRPC client's error handling | Always use a non-OK status for errors |
| Adding all codes to retryableStatusCodes | Retries non-idempotent operations; data corruption | Only `UNAVAILABLE` per AIP-194 (case-by-case for others) |
| Treating HTTP 412 as `FAILED_PRECONDITION` in gateway | grpc-gateway maps FP→400 (not 412) | Verify the mapping in `runtime/errors.go` |
| Asserting on error message string in tests | Breaks on i18n / wording tweaks | Assert on `code()` only |

## Custom error details

For richer error info beyond the code, embed
`google.rpc.ErrorInfo` / `BadRequest` / `Help` in
`status.Details`:

```python
from google.rpc import error_details_pb2, status_pb2
from grpc_status import rpc_status

def get_user_with_details(stub, user_id):
    try:
        return stub.GetUser(GetUserRequest(id=user_id))
    except grpc.RpcError as e:
        status = rpc_status.from_call(e)
        for detail in status.details:
            if detail.Is(error_details_pb2.BadRequest.DESCRIPTOR):
                bad_req = error_details_pb2.BadRequest()
                detail.Unpack(bad_req)
                for v in bad_req.field_violations:
                    print(f"{v.field}: {v.description}")
```

Tests should assert on detail messages where richer signal exists.

## Limitations

- **No standard payload for codes.** Each service defines its own
  "structured details" envelope (Google uses `google.rpc.*`;
  others roll their own).
- **HTTP mapping is gateway-specific.** envoy, grpc-gateway, and
  hand-rolled adapters can differ. The grpc-gateway table above
  is the most common reference.
- **`UNKNOWN` is overused in the wild.** Defensive servers
  default to `UNKNOWN` to avoid leaking internals; this defeats
  observability.
- **Status code metrics.** Dashboards that aggregate by code lose
  information when servers route everything through `INTERNAL`.

## References

- gRPC standard status codes:
  [grpc.io/docs/guides/status-codes/](https://grpc.io/docs/guides/status-codes/).
- AIP-194 retry semantics:
  [google.aip.dev/194](https://google.aip.dev/194).
- AIP-193 error model:
  [google.aip.dev/193](https://google.aip.dev/193).
- grpc-gateway HTTP mapping source:
  [github.com/grpc-ecosystem/grpc-gateway/blob/main/runtime/errors.go](https://github.com/grpc-ecosystem/grpc-gateway/blob/main/runtime/errors.go).
- Consumed by:
  [`buf-cli-lint-breaking-build`](../buf-cli-lint-breaking-build/SKILL.md),
  [`ghz-load`](../ghz-load/SKILL.md),
  [`grpcurl-cli`](../grpcurl-cli/SKILL.md),
  [`grpc-mock`](../grpc-mock/SKILL.md),
  [`grpc-streaming-test-author`](../grpc-streaming-test-author/SKILL.md).
