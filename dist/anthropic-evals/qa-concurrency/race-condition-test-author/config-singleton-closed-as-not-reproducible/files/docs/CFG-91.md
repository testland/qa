# CFG-91 - handlers occasionally see an unconfigured registry at cold start

## Symptom

For a few hundred milliseconds after a pod starts taking traffic, some request
handlers get a `ConfigRegistry` back from `get()` that is non-null but:

- `refreshSeconds()` returns `0` rather than `30`
- `endpoint("billing")` returns `null`
- `size()` returns `0`

After that window every handler on the pod is fine, indefinitely.

## History

- 2026-07-14 - opened, 6 occurrences on the x86 fleet over two months.
- 2026-08-21 - @jharlan: "Wrote ConfigPublicationTest against the first-access
  path. 50,000,000 samples in 41 minutes, nothing interesting, nothing failed.
  Report attached. Closing as not reproducible."
- 2026-09-02 - reopened. Graviton (arm64) migration began 2026-09-01.
- 2026-09-11 - 41 occurrences in six weeks. **All 41 on the arm64 node pool.
  None on the x86 pool in the same window.** Same traffic mix on both.

## Notes

- Every occurrence is within 400ms of the pod's first request.
- The JVM is 21.0.4 on both pools. Same image, same flags.
- @jharlan: "Same harness, eight hours on arm64, settles it either way."
