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
