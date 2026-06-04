# qa-grpc

gRPC testing tooling: buf-CLI lint and breaking-build, ghz load testing, grpcurl CLI, grpc-mock servers, protobuf versioning strategy reference, gRPC streaming test patterns, and status-code mapping reference. Distinct from qa-realtime-protocols/grpc-streaming-tests (wire-level streaming semantics) and qa-contract-testing/protobuf-compat-checking (schema-level breaking detection); this plugin scopes to tooling, load, linting, and framework-level testing.

## Components

| Type | Name | Description |
| --- | --- | --- |
| skill | buf-cli-lint-breaking-build | Gate proto PRs with `buf build`, `buf lint`, and `buf breaking` |
| skill | ghz-load | Benchmark gRPC throughput and latency with ghz |
| skill | grpc-mock | Author in-process gRPC mock servers for client-side tests |
| skill | grpc-status-code-mapping-reference | Reference catalog of the 17 canonical gRPC status codes, retry semantics, and HTTP mapping |
| skill | grpc-streaming-test-author | Build streaming-RPC test suites covering ordering, cancellation, and deadline paths |
| skill | grpcurl-cli | Invoke gRPC services from the CLI with grpcurl |
| skill | protobuf-versioning-strategy-reference | Reference catalog of protobuf3 breaking-change categories and safe evolution patterns |
| agent | grpc-service-reviewer | Adversarial PR reviewer that gates gRPC service changes on status-code coverage, deadline tests, buf CI wiring, streaming-RPC tests, and mock harness presence |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-grpc@testland-qa
```

## Rating

All components in this plugin pass the v4.0 quality gate
(8 dimensions, 0-40 scale, importable bar 28/40). CI enforces total
>=21/30 with d6 >=1 (v2.0 floor); D7 (eval coverage) and D8 (best-practices
adherence) are advisory through the shadow window. See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) for the
rubric.See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at
the repository root for the rubric.
