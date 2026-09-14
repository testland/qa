# ING-812 — ingest pods OOMKilled on a ~65h cycle

| | |
|---|---|
| Limit | 6GiB |
| RSS at rollout | ~480MB |
| Time to OOMKill | 60-70h, consistent across all 9 pods |
| Shape | Linear. No sawtooth, no step, no spike. |

## pprof goroutine counts, pod ingest-7c4

| Age | Goroutines | Top frames |
|---|---|---|
| 12h | 4,112 | `internal/pool.(*Pool).drainResults`, `internal/pool.(*Pool).reportDepth` |
| 36h | 11,908 | same two, same ratio |
| 60h | 19,644 | same two, same ratio |

Ratio is stable at 2 goroutines per `New` call. The service constructs a pool
per ingest batch and runs roughly 160 batches an hour.

## Notes from the thread

- @tbeck: "We run the detector on every PR against this package and it has
  never once printed anything. This is not a concurrency bug. Look at the JSON
  decoder — encoding/json holds a 64KB scratch buffer per decoder and we build
  a lot of decoders."
- Heap profile does not show growth in `encoding/json`. Inuse_space at 60h is
  310MB against 19,644 goroutines.
- `TestPoolDoesNotLeak` exists and is green.
