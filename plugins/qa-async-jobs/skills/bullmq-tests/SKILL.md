---
name: bullmq-tests
description: "Authors and runs BullMQ job tests in TypeScript / JavaScript - `Queue` and `Worker` patterns, processor mocking, retry/backoff/repeat-job assertions, FlowProducer for parent-child job dependencies, QueueEvents listeners; tests use a real Redis instance (Docker / Testcontainers / `ioredis-mock` for stricter unit-test isolation). Use when the user works with BullMQ in Node.js services and needs unit / integration tests for queue producers, worker processors, or flow orchestration."
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

## How to use

1. Install `bullmq` (add `ioredis-mock` for stricter unit isolation) - see Install.
2. Point tests at a shared connection: a real Redis (Docker / Testcontainers) for integration, or `ioredis-mock` for pure unit tests of producer logic.
3. Test the producer - enqueue, then assert on `queue.getJobs(['waiting'])`; `drain()` between tests and `close()` in `afterAll` (see Worked example).
4. Test the worker - call the processor function directly for unit tests, or run a real `Worker` + `QueueEvents` for integration (see Worked example).
5. For retry / backoff, repeat-job, FlowProducer flows, and CI wiring, see [references/advanced-patterns-and-ci.md](references/advanced-patterns-and-ci.md).

## Install

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

## Basic Queue + Worker pattern

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

## Worked example

An order flow: assert that placing an order enqueues a job, then that
the processor ships it.

First, test the producer - enqueue, then read the queue by state:

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

Then test the processor. For unit tests, call the processor function
directly (avoid spinning up a real Worker):

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

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Skip `await queue.drain()` between tests | Stale jobs leak across tests; flaky | Drain in beforeEach (Worked example) |
| Spin up Worker for every unit test | Slow + Redis-coupled | Test processor function directly (Worked example) |
| `queue.add()` without `await` | Race: test exits before job is enqueued | Always `await` queue ops |
| Skip `worker.close()` / `queue.close()` in afterAll | Hangs CI; Redis connections leaked | Close in afterAll (Worked example) |
| `ioredis-mock` for QueueEvents tests | Mock has gaps in pub/sub command emulation | Use real Redis for events |

## Limitations

- BullMQ has no first-party "fake mode" like Sidekiq -
  test-vs-production parity comes from real Redis.
- `ioredis-mock` covers 90% of BullMQ usage but can produce
  false-passing tests on edge-case Redis commands.
- FlowProducer parent-child tests require coordination across two
  queues - tests are integration-only, can't be pure unit tests.
- BullMQ Pro features (rate limiters, observables) follow the same
  testing pattern but require Pro license.

## References

- [bm-gh][bm-gh] - repo, install, basic Queue/Worker pattern,
  FlowProducer
- docs.bullmq.io - full documentation
- [references/advanced-patterns-and-ci.md](references/advanced-patterns-and-ci.md) -
  retry/backoff, repeat-job, FlowProducer, and CI wiring
- `sidekiq-tests`,
  `celery-tests`,
  `sqs-tests`,
  `rabbitmq-tests` - sister tools
- `cron-job-test-author`,
  `idempotency-test-author` -
  build-an-X authors
