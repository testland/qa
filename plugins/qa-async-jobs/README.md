# qa-async-jobs

Background job and queue testing. Five per-tool skill wrappers
covering the mainstream OSS + AWS queue ecosystem (Sidekiq, Celery,
BullMQ, SQS, RabbitMQ) plus two build-an-X workflow skills for
cross-tool patterns (cron-job-test-author, idempotency-test-author).

Covers the production-defect cluster around at-least-once delivery,
retry storms, dead-letter handling, missed cron executions, and
idempotency.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Agent | [async-job-health-critic](agents/async-job-health-critic.md) | Read-only adversarial critic: scans queue/worker code for missing retry limits, absent dead-letter routing, uncapped backoff, and missing idempotency guards across BullMQ/Celery/Sidekiq/SQS/RabbitMQ; emits findings + BLOCK/PASS verdict |
| Skill | [sidekiq-tests](skills/sidekiq-tests/SKILL.md) | Sidekiq fake!/inline!/disable! test modes; RSpec + Minitest helpers; retry + scheduled-set + unique-jobs testing |
| Skill | [celery-tests](skills/celery-tests/SKILL.md) | pytest-celery fixtures (celery_app, celery_worker, celery_session_worker); apply() vs delay(); retry-mocking via patch() |
| Skill | [bullmq-tests](skills/bullmq-tests/SKILL.md) | Queue + Worker patterns; QueueEvents listeners; retry/backoff/repeat-job; FlowProducer parent-child |
| Skill | [sqs-patterns](skills/sqs-patterns/SKILL.md) | Standard vs FIFO semantics; visibility timeout; DLQ routing; mock (aws-sdk-client-mock / moto) vs LocalStack vs real SQS |
| Skill | [rabbitmq-patterns](skills/rabbitmq-patterns/SKILL.md) | 6 canonical tutorial patterns (Hello World / Work Queues / Pub-Sub / Routing / Topics / RPC); Publisher Confirms; ack/nack/requeue; DLX |
| Skill | [cron-job-test-author](skills/cron-job-test-author/SKILL.md) | Build-an-X for cron tests: expression validation, DST + leap-day edge cases, missed-execution detection, overlap protection, stale-lock recovery |
| Skill | [idempotency-test-author](skills/idempotency-test-author/SKILL.md) | Build-an-X for idempotency tests: idempotency-key pattern (Stripe/AWS), commutative side effects, TTL tuning, concurrent-duplicate race tests |
| Skill | [kafka-consumer-tests](skills/kafka-consumer-tests/SKILL.md) | Test Kafka consumers/producers: Testcontainers, offsets, rebalance, EOS/transactions, dead-letter topics. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-async-jobs@testland-qa
```
