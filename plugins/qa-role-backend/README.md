# Backend, API & distributed-systems QA

Backend, API & distributed-systems QA role bundle: one-command install of API/contract/GraphQL/gRPC/real-time testing, auth flows, notifications, payment, async jobs, DB migrations, caching, concurrency, saga/CQRS, distributed tracing, serverless, time/timezones, feature flags, and experimentation.

Installing this one plugin installs all 18 member plugins below in a single command.

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-role-backend@testland-qa
```

Claude Code resolves and installs the member plugins automatically and lists what it added. Requires Claude Code v2.1.110+ (v2.1.143+ to enable the whole set together).

## What this installs

- **qa-api-testing** - API testing
- **qa-contract-testing** - Contract testing for microservices
- **qa-graphql** - GraphQL server testing
- **qa-grpc** - gRPC testing tooling
- **qa-realtime-protocols** - Real-time protocol testing
- **qa-auth-flows** - Auth flow testing
- **qa-notifications** - Notifications + messaging testing
- **qa-payment** - Payment platform sandbox testing
- **qa-async-jobs** - Background job and queue testing
- **qa-db-migrations** - Database migration testing
- **qa-cache-testing** - Cache testing across layers
- **qa-concurrency** - Concurrency + race-condition testing
- **qa-saga-cqrs** - Saga + CQRS + event sourcing test patterns
- **qa-distributed-tracing** - Distributed tracing assertion testing
- **qa-serverless** - Serverless platform testing
- **qa-time** - Time-related testing
- **qa-feature-flags** - Feature-flag platform testing
- **qa-experimentation** - Experimentation harness testing

## About role bundles

This is a **role bundle** - a plugin that ships no skills or agents of its own. It exists only to install a curated set of testing plugins together so you adopt a whole role in one command instead of installing each plugin by hand. Prefer a narrower set? Install just the member plugins you need individually.
