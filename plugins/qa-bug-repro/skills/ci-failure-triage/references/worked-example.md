# Worked example: CI failure triage

Failure: `tests/cart.spec.ts:42 - adds an item`, red on commit `e3a91f4`.

Signals extracted: S1 `assertion-mismatch` (`expect(cart.count).toBe(1)`);
S2 12 consecutive green runs before this one, 1 red in the last 50; S3 no
co-failures in the run; S4 no clustering; S5 runner image and container tag
unchanged; S6 `src/cart/addItem.ts` modified inside the window, changing
`validateQty()`; S7 not on any quarantine list.

R1 does not fire (S7 empty). R2 does not fire (no S5 delta, and the mode is
`assertion-mismatch`). R3 fires: all four conditions hold.

```markdown
## Failure classification - `tests/cart.spec.ts:42 - adds an item`

**Verdict:** defect
**Confidence:** high
**Windows used:** last 50 runs, 7 days of history, N=5 green-run threshold

**Evidence:**
- S2: 12 consecutive green runs immediately before this failure, exceeding the N=5 threshold.
- S6: `src/cart/addItem.ts` changed in `e3a91f4..HEAD`, modifying `validateQty()`; diff read.
- S1: `assertion-mismatch` on `expect(cart.count).toBe(1)`, not a timeout and not a network error.
- S2: a rerun of `e3a91f4` in the history reproduced the same failure.

**Recommended next step:**
1. Capture the runner's trace artifact for the failing run if one was not retained.
2. Draft the defect report against the team's bug schema, using the verbatim assertion as the actual value.
3. Lock the reproduction in a committed failing test before changing production code.
4. Route to the team that owns `src/cart/`.

**Not classified as:**
- `flaky-known` - S7 found no quarantine annotation, decorator, or flake-list entry for this test.
- `environment-drift` - S5 shows runner image and container tag unchanged across the window, and the mode is `assertion-mismatch`, which R2 excludes.
- `timeout` - S1 is `assertion-mismatch`, not `timed-out`.
- `flaky-pre-incident` - S2 shows a clean 12-run green streak, so the failure is not intermittent, and S6 shows change-set proximity, which R3 claims first.
- `flake-of-unknown-cause` - not reached; R3 matched.
```
