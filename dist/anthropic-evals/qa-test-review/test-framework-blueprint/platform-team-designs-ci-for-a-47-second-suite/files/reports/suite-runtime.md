# Suite runtime, measured 2026-09-10

Full suite, one worker, chromium only:

| Tier                          | Specs | Runtime |
|-------------------------------|-------|---------|
| Browser (`tests/`)            | 14    | 41s     |
| API (`test/`, node --test)    | 23    | 6s      |
| Total                         | 37    | 47s     |

The same run on a CI runner is 1m10s. Runner provisioning and the browser
download add a further 55s before the first test starts; on Marek's baked
image the browser download part of that is gone.

Dry run of `--shard=n/8` across the 14 browser specs:

| Shard | Specs | Test time | Wall time incl. startup |
|-------|-------|-----------|-------------------------|
| 1/8   | 2     | 9s        | 64s                     |
| 2/8   | 2     | 7s        | 62s                     |
| 3/8   | 2     | 6s        | 61s                     |
| 4/8   | 2     | 5s        | 60s                     |
| 5/8   | 2     | 6s        | 61s                     |
| 6/8   | 2     | 4s        | 59s                     |
| 7/8   | 1     | 3s        | 58s                     |
| 8/8   | 1     | 1s        | 56s                     |

The pipeline account is billed per job-minute.
