# qa-grpc

gRPC testing tooling: buf-CLI lint and breaking-build, ghz load testing, grpcurl CLI, grpc-mock servers, protobuf versioning strategy reference, gRPC streaming test patterns, and status-code mapping reference. Distinct from qa-realtime-protocols/grpc-streaming-tests (wire-level streaming semantics) and qa-contract-testing/protobuf-compat-checking (schema-level breaking detection); this plugin scopes to tooling, load, linting, and framework-level testing.

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| (filled in as components are added) | | | |

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
