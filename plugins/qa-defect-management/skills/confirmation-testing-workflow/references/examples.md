# Confirmation testing - worked example and anti-patterns

## Worked example

Defect: duplicate invoice rows are created when the same invoice is submitted
concurrently. Fix commit `9c4e7b2`. Environment: staging, reporting build SHA
`9c4e7b2` from its build-metadata endpoint.

1. **Containment.** `git merge-base --is-ancestor 9c4e7b2 9c4e7b2` exits 0 (a
   commit is its own ancestor). Staging contains the fix. Note that the check
   ran against the build SHA staging reported, not against the release tag
   `v2.14.0`, which was cut in a later commit.
2. **Reproduction.** A tier 1 artifact exists:
   `tests/invoices/concurrent-submit.spec.ts`, committed red before the fix and
   confirmed red on `9c4e7b2^`.
3. **Re-run.** Exactly that spec, nothing wider:

   ```
   Running 1 test using 1 worker
     ok  tests/invoices/concurrent-submit.spec.ts:18:5 > creates exactly one
         invoice row for 5 concurrent submits (2.9s)
   1 passed (4.1s)
   ```

4. **Verdict: VERIFIED.** The artifact that produced the duplicate rows before
   the fix produces exactly one row now, in a build proven to contain the fix.

Two variants of the same run:

- Output reads `2 rows found, expected 1` -> **NOT FIXED**. Same report shape,
  failing output attached, defect reopened.
- Output reads `1 passed` but the containment check exited 1 because staging is
  on `3f1d0aa` -> **BLOCKED**, not VERIFIED. The pass came from a build without
  the fix, so it says nothing about the fix. Report the deployment gap.

## Anti-patterns

| Anti-pattern | Why it fails | Do instead |
|---|---|---|
| "The release notes say it shipped in 2.14.0" | A version label is a claim about a build, not a property of it | Ancestry-check the fix SHA against the build SHA |
| Running the whole suite instead of the reproduction | Unrelated failures contaminate the verdict; a green suite is regression evidence, not confirmation | Run exactly the reproduction artifact |
| Accepting a green test that was never seen red | A test that always passed is not a reproduction of anything | Confirm red on the fix commit's parent first |
| Calling a flaky-quarantined pass VERIFIED | The pass rate is uncorrelated with the fix | Stabilise the test, then re-run |
| Recording "works for me" with no output | Unfalsifiable; the next person cannot re-check it | Attach verbatim output and both SHAs |

The verdict table's governing rule already covers the two remaining traps
(downgrading BLOCKED to VERIFIED, and reporting NOT FIXED on a build that lacks
the fix): both resolve to BLOCKED - see Step 3.
