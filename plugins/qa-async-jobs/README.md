# qa-async-jobs

Background job and queue testing. Five per-tool skill wrappers
covering the mainstream OSS + AWS queue ecosystem (Sidekiq, Celery,
BullMQ, SQS, RabbitMQ) plus two build-an-X workflow skills for
cross-tool patterns (cron-job-test-author, idempotency-test-author).

Covers the production-defect cluster around at-least-once delivery,
retry storms, dead-letter handling, missed cron executions, and
idempotency.

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| Skill | [sidekiq-tests](skills/sidekiq-tests/SKILL.md) | S1 | Sidekiq fake!/inline!/disable! test modes; RSpec + Minitest helpers; retry + scheduled-set + unique-jobs testing |
| Skill | [celery-tests](skills/celery-tests/SKILL.md) | S1 | pytest-celery fixtures (celery_app, celery_worker, celery_session_worker); apply() vs delay(); retry-mocking via patch() |
| Skill | [bullmq-tests](skills/bullmq-tests/SKILL.md) | S1 | Queue + Worker patterns; QueueEvents listeners; retry/backoff/repeat-job; FlowProducer parent-child |
| Skill | [sqs-patterns](skills/sqs-patterns/SKILL.md) | S1 | Standard vs FIFO semantics; visibility timeout; DLQ routing; mock (aws-sdk-client-mock / moto) vs LocalStack vs real SQS |
| Skill | [rabbitmq-patterns](skills/rabbitmq-patterns/SKILL.md) | S1 | 6 canonical tutorial patterns (Hello World / Work Queues / Pub-Sub / Routing / Topics / RPC); Publisher Confirms; ack/nack/requeue; DLX |
| Skill | [cron-job-test-author](skills/cron-job-test-author/SKILL.md) | S3 | Build-an-X for cron tests: expression validation, DST + leap-day edge cases, missed-execution detection, overlap protection, stale-lock recovery |
| Skill | [idempotency-test-author](skills/idempotency-test-author/SKILL.md) | S3 | Build-an-X for idempotency tests: idempotency-key pattern (Stripe/AWS), commutative side effects, TTL tuning, concurrent-duplicate race tests |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-async-jobs@testland-qa
```

## Rating

All components in this plugin pass the v4.0 quality gate
(8 dimensions, 0-40 scale, importable bar 28/40). CI enforces total
>=21/30 with d6 >=1 (v2.0 floor); D7 (eval coverage) and D8 (best-practices
adherence) are advisory through the shadow window. See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) for the
rubric.See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at
the repository root for the rubric.
