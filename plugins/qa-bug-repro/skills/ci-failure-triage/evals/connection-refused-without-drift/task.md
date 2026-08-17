# Session tests get connection refused, but the cache service is up

## Problem Description

`session.spec.ts` fails with `connect ECONNREFUSED 127.0.0.1:6379` about one
run in six. It reads like the cache service being down, so we raised it with
the platform team. They came back with the service container logs: it starts
before the suite, stays up for the whole job, never restarts, and other tests
hit it successfully in the same run. They closed the ticket as not-reproducible
and pointed at us.

We reopened it, because a connection-refused error is obviously not our test's
fault. That ticket has now bounced twice and two weeks have gone by. Meanwhile
people rerun the job until it goes green, which usually takes one try.

We have the failing run, the container's own logs, and the per-run history our
tooling records. We want a determination that ends the ping-pong: what this
failure actually is, and who can act on it.

## Output Specification

Produce `triage-session-redis.md` containing:

1. What kind of failure this is and who owns the next action.
2. The evidence from the attached files that supports it, quoting the specific
   lines and values you relied on.
3. The other explanations you considered and, for each, the specific observed
   value that rules it out.
4. The next action, stated so someone else can carry it out.

If the attached material does not settle the question, say so and name exactly
what you would need to collect. Do not fill a gap with the most likely story.

Out of scope: writing the fix, editing tests or fixtures, changing the runner
configuration, or drafting a bug-report form.

## Input Files

Extract the following files before beginning.

=============== FILE: logs/ci-9042.log ===============
2026-08-16T13:20:41Z ##[group]Initialize containers
2026-08-16T13:20:41Z /usr/bin/docker pull redis@sha256:1f9c4e0d77bb35a1a04c6b2f0e58a1d3c9e2b7a80f4d61c8e3a2b5d70f9c1a44
2026-08-16T13:20:48Z Status: Image is up to date
2026-08-16T13:20:49Z ##[endgroup]
2026-08-16T13:20:52Z ##[group]Run npx jest --ci --maxWorkers=4
2026-08-16T13:21:34Z PASS tests/cache/warmup.spec.ts (w1)
2026-08-16T13:22:02Z PASS tests/orders/checkout.spec.ts (w3)
2026-08-16T13:22:19Z PASS tests/cache/eviction.spec.ts (w2)
2026-08-16T13:22:19Z   [test] cache/eviction afterAll: closing shared redis client (src/testing/redisClient.ts:41)
2026-08-16T13:22:41Z PASS tests/orders/refunds.spec.ts (w3)
2026-08-16T13:22:58Z FAIL tests/session/session.spec.ts (w2)
2026-08-16T13:22:58Z   ● renews an expiring session
2026-08-16T13:22:58Z     Error: connect ECONNREFUSED 127.0.0.1:6379
2026-08-16T13:22:58Z         at TCPConnectWrap.afterConnect [as oncomplete] (node:net:1607:16)
2026-08-16T13:22:58Z         at Object.getClient (src/testing/redisClient.ts:28:20)
2026-08-16T13:22:58Z         at Object.<anonymous> (tests/session/session.spec.ts:22:26)
2026-08-16T13:23:10Z PASS tests/session/logout.spec.ts (w4)
2026-08-16T13:23:22Z PASS tests/cache/ttl.spec.ts (w1)
2026-08-16T13:23:40Z Test Suites: 1 failed, 21 passed, 22 total
2026-08-16T13:23:41Z ##[group]Post job: service container "redis"
2026-08-16T13:23:41Z redis_1 | 1:M 16 Aug 2026 13:20:50.114 * Ready to accept connections tcp
2026-08-16T13:23:41Z redis_1 | 1:M 16 Aug 2026 13:23:40.882 * DB saved on disk
2026-08-16T13:23:41Z $ docker inspect --format '{{.State.Status}} restarts={{.RestartCount}} health={{.State.Health.Status}}' redis_1
2026-08-16T13:23:41Z running restarts=0 health=healthy
2026-08-16T13:23:41Z $ docker exec redis_1 redis-cli info clients | head -2
2026-08-16T13:23:41Z connected_clients:3
2026-08-16T13:23:41Z blocked_clients:0
2026-08-16T13:23:42Z ##[error]Process completed with exit code 1.

=============== FILE: ci/history-9042.md ===============
## `tests/session/session.spec.ts`, last 50 runs

| Result | Runs | Worker holding session.spec.ts | Worker holding cache/eviction.spec.ts |
|---|---|---|---|
| fail (ECONNREFUSED 127.0.0.1:6379) | 8 | w2 (5), w1 (2), w4 (1) | same worker as session.spec.ts in all 8, and scheduled before it in all 8 |
| pass | 42 | varies | a different worker in all 42 |

- Jest assigns spec files to workers by remaining-duration order; assignment
  varies run to run.
- The redis service container image is pinned by digest
  `sha256:1f9c4e0d...c1a44` and is byte-identical across all 50 runs. Runner
  image `ubuntu-24.04 / 20260810.1.0`, unchanged for 11 days.
- In all 8 failing runs the container reported `restarts=0` and
  `health=healthy` in the post-job capture.
- No quarantine list, flake list, or skip annotation exists in this repository.

## Changes in the window

```
$ git log --oneline --since=2026-07-20 -- src/session/ src/cache/ src/testing/redisClient.ts
(no commits)
```

```
$ git log --oneline --since=2026-08-09
d5510aa (2026-08-15) feat(web): add a keyboard shortcut overlay
81ce33f (2026-08-11) chore(ci): raise jest workers from 2 to 4
```

=============== FILE: src/testing/redisClient.ts ===============
import { createClient } from 'redis';

let client: ReturnType<typeof createClient> | null = null;

export async function getClient() {
  if (!client) {
    client = createClient({ url: 'redis://127.0.0.1:6379' });
    await client.connect();
  }
  return client;
}

export async function closeClient() {
  if (client) {
    await client.quit();
  }
}
