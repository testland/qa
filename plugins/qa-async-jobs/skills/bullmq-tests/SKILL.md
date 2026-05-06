---
name: bullmq-tests
description: Authors and runs BullMQ job tests in TypeScript / JavaScript — `Queue` and `Worker` patterns, processor mocking, retry/backoff/repeat-job assertions, FlowProducer for parent-child job dependencies, QueueEvents listeners; tests use a real Redis instance (Docker / Testcontainers / `ioredis-mock` for stricter unit-test isolation). Use when the user works with BullMQ in Node.js services and needs unit / integration tests for queue producers, worker processors, or flow orchestration.
rating: 22
d6: 4
archetype: S1
---

# bullmq-tests

## Overview

Per [github.com/taskforcesh/bullmq][bm-gh]:

[bm-gh]: https://github.com/taskforcesh/bullmq

> "The fastest, most reliable, Redis-based distributed queue for
> Node. Carefully written for rock solid stability and atomicity."

BullMQ's testing model differs from Sidekiq / Celery: there is no
"fake mode" or in-memory queue substitute. Tests use real Redis
(Docker / Testcontainers) or stub it via `ioredis-mock`. Tests
typically validate: queue add → worker processor → completion event.

## When to use

- The repo has BullMQ Queue + Worker definitions in Node.js / TS.
- The user writes tests for queue producer logic (controllers,
  service layers).
- The user writes tests for worker processor business logic.
- A test verifies retry / backoff / FlowProducer parent-child
  semantics.

## Step 1 — Install

Per [bm-gh][bm-gh]:

```bash
yarn add bullmq
# or
npm install bullmq
```

For tests, add `ioredis-mock` for in-memory Redis simulation:

```bash
npm install --save-dev ioredis-mock
```

## Step 2 — Basic Queue + Worker pattern

Per [bm-gh][bm-gh] (verbatim):

```typescript
import { Queue } from 'bullmq';

const queue = new Queue('Paint');
queue.add('cars', { color: 'blue' });
```

```typescript
import { Worker } from 'bullmq';

const worker = new Worker('Paint', async job => {
  if (job.name === 'cars') {
    await paintCar(job.data.color);
  }
});
```

The `Queue` produces; the `Worker` consumes. Tests typically import
and invoke both within the test process.

## Step 3 — Test producer (assert job added to queue)

```typescript
import { Queue } from 'bullmq';
import { redisConfig } from './test-config';   // Docker Redis or ioredis-mock

describe('order producer', () => {
  let queue: Queue;
  beforeAll(() => { queue = new Queue('orders', { connection: redisConfig }); });
  beforeEach(async () => { await queue.drain(); });   // clear queue between tests
  afterAll(async () => { await queue.close(); });

  it('enqueues an order job', async () => {
    await placeOrder({ customerId: 1, items: [...] });

    const jobs = await queue.getJobs(['waiting']);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].data.customerId).toBe(1);
  });
});
```

`queue.getJobs(['waiting'])` retrieves jobs in a specific state.
Other states: `'active'`, `'completed'`, `'failed'`, `'delayed'`,
`'paused'`.

## Step 4 — Test worker processor

Test the processor function directly (avoid spinning up a real
Worker for unit tests):

```typescript
const processOrder = async (job: Job<OrderData>) => {
  await chargeCard(job.data);
  await sendConfirmationEmail(job.data);
  return { status: 'shipped' };
};

it('processes an order successfully', async () => {
  const job = { data: { customerId: 1, total: 100 } } as Job<OrderData>;
  const result = await processOrder(job);
  expect(result.status).toBe('shipped');
});
```

For integration tests, instantiate a real Worker and assert via
QueueEvents:

```typescript
import { Queue, Worker, QueueEvents } from 'bullmq';

it('processes via real worker', async () => {
  const queue = new Queue('orders', { connection: redisConfig });
  const worker = new Worker('orders', processOrder, { connection: redisConfig });
  const events = new QueueEvents('orders', { connection: redisConfig });

  await new Promise<void>((resolve) => {
    events.on('completed', ({ jobId, returnvalue }) => {
      expect(JSON.parse(returnvalue).status).toBe('shipped');
      resolve();
    });
    queue.add('order', { customerId: 1 });
  });

  await worker.close(); await queue.close(); await events.close();
});
```

## Step 5 — Test retry + backoff

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

## Step 6 — Test repeat-job (cron / interval)

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

Cross-ref [`cron-job-test-author`](../cron-job-test-author/SKILL.md)
for cron-expression validation patterns.

## Step 7 — FlowProducer for parent-child jobs

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

## Step 8 — CI integration

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
uses — for full integration, use real Redis. For pure unit tests of
producer logic, ioredis-mock is faster.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Skip `await queue.drain()` between tests | Stale jobs leak across tests; flaky | Drain in beforeEach (Step 3) |
| Spin up Worker for every unit test | Slow + Redis-coupled | Test processor function directly (Step 4) |
| `queue.add()` without `await` | Race: test exits before job is enqueued | Always `await` queue ops |
| Skip `worker.close()` / `queue.close()` in afterAll | Hangs CI; Redis connections leaked | Close in afterAll (Step 4) |
| `ioredis-mock` for QueueEvents tests | Mock has gaps in pub/sub command emulation | Use real Redis for events |

## Limitations

- BullMQ has no first-party "fake mode" like Sidekiq —
  test-vs-production parity comes from real Redis.
- `ioredis-mock` covers 90% of BullMQ usage but can produce
  false-passing tests on edge-case Redis commands.
- FlowProducer parent-child tests require coordination across two
  queues — tests are integration-only, can't be pure unit tests.
- BullMQ Pro features (rate limiters, observables) follow the same
  testing pattern but require Pro license.

## References

- [bm-gh][bm-gh] — repo, install, basic Queue/Worker pattern,
  FlowProducer
- docs.bullmq.io — full documentation
- [`sidekiq-tests`](../sidekiq-tests/SKILL.md),
  [`celery-tests`](../celery-tests/SKILL.md),
  [`sqs-patterns`](../sqs-patterns/SKILL.md),
  [`rabbitmq-patterns`](../rabbitmq-patterns/SKILL.md) — sister tools
- [`cron-job-test-author`](../cron-job-test-author/SKILL.md),
  [`idempotency-test-author`](../idempotency-test-author/SKILL.md) —
  build-an-X authors
