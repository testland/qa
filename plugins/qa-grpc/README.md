# qa-grpc

gRPC testing tooling: buf-CLI lint and breaking-build (with the protobuf versioning catalog in its references), ghz load testing, grpcurl CLI, grpc-mock servers (with interceptor test patterns in its references), and the single gRPC-streaming test home (with the status-code catalog and wire-level patterns in its references). Distinct from qa-contract-testing/protobuf-compat-checking (schema-level breaking detection); this plugin scopes to tooling, load, linting, and framework-level testing.

## Components

| Type | Name | Description |
| --- | --- | --- |
| skill | buf-cli-lint-breaking-build | Gate proto PRs with `buf build`, `buf lint`, and `buf breaking`; protobuf versioning + breaking-change catalog in references/ |
| skill | ghz-load | Benchmark gRPC throughput and latency with ghz |
| skill | grpc-mock | Author in-process gRPC mock servers for client-side tests; interceptor test patterns in references/ |
| skill | grpc-streaming-test-author | Build streaming-RPC test suites covering ordering, cancellation, and deadline paths; status-code catalog + wire-level patterns in references/ |
| skill | grpcurl-cli | Invoke gRPC services from the CLI with grpcurl |
| agent | grpc-service-reviewer | Adversarial PR reviewer that gates gRPC service changes on status-code coverage, deadline tests, buf CI wiring, streaming-RPC tests, and mock harness presence |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-grpc@testland-qa
```
