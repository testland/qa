# BullMQ advanced patterns and CI wiring

Deep reference for the `bullmq-tests` SKILL.md. Consult when a test
asserts retry / backoff, repeat-job registration, or FlowProducer
parent-child semantics, or when wiring BullMQ tests into CI.

[bm-gh]: https://github.com/taskforcesh/bullmq

## Retry + backoff

Configure attempts and backoff when enqueuing:

```typescript
await queue.add('flaky', { id: 1 }, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 },
});
```

To test that a worker actually retries:

```typescript
let attempts = 0;
const flakyProcessor = async (job: Job) => {
  attempts++;
  if (attempts < 3) throw new Error('transient');
  return 'success';
};

const worker = new Worker('flaky', flakyProcessor, { connection: redisConfig });
// ... await events.completed → assert attempts === 3
```

## Repeat-job (cron / interval)

```typescript
await queue.add('hourly-cleanup', {}, {
  repeat: { pattern: '0 * * * *' },  // cron syntax
});
```

For tests, assert the repeat job is registered:

```typescript
const repeatJobs = await queue.getRepeatableJobs();
expect(repeatJobs).toHaveLength(1);
expect(repeatJobs[0].pattern).toBe('0 * * * *');
```

Cross-ref `cron-job-test-author`
for cron-expression validation patterns.

## FlowProducer for parent-child jobs

Per [bm-gh][bm-gh] the README references parent-child relationships
via FlowProducer:

```typescript
import { FlowProducer } from 'bullmq';

const flow = new FlowProducer({ connection: redisConfig });
const tree = await flow.add({
  name: 'parent-job',
  queueName: 'parents',
  data: {},
  children: [
    { name: 'child-1', queueName: 'children', data: { idx: 1 } },
    { name: 'child-2', queueName: 'children', data: { idx: 2 } },
  ],
});

// Test: parent only completes after all children complete
```

## CI integration

For tests that need real Redis:

```yaml
services:
  redis:
    image: redis:7
    ports: [6379:6379]
```

For tests using `ioredis-mock` only, no service needed:

```typescript
import IORedisMock from 'ioredis-mock';
const connection = new IORedisMock();
const queue = new Queue('test', { connection });
```

`ioredis-mock` doesn't perfectly emulate every Redis command BullMQ
uses - for full integration, use real Redis. For pure unit tests of
producer logic, ioredis-mock is faster.
