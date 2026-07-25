# Removal ledger, confidence, and report format

Deep reference for `test-removal-criteria` SKILL.md. Consult when packaging a
removal pass for review: how much confidence each class carries, how to record
every proposed removal in the ledger, and the exact artifacts a finished pass
must produce. The decision logic (classes, delete gate, actions) stays in the
SKILL; this file is the output-and-recording surface.

## Confidence to action

Confidence is a property of the *classification*, not a license to skip the
gate. Every row below still passes the Step 3 delete gate before anything is
removed.

| Class | Typical confidence | How it may be proposed |
|-------|--------------------|------------------------|
| `duplicate` | high | Batched into one change set, one removal per duplicate group, kept copy named per group. |
| `trivial` | high | Batched into one change set, separate from other classes. |
| `orphan` | high | Batched, with the missing module named per row. |
| `tautology` | medium | Individually reviewed. Rewrite is the expected outcome; removal is the exception. |
| `dead-signal` | low | Individually reviewed with per-test sign-off. Never batched, never proposed as a bulk delete. |

Keep classes in separate change sets. A single change set mixing high and low
confidence rows trains the reviewer to skim, and the low-confidence rows are
exactly the ones that need reading.

## Record every removal

One row per proposed removal, in the change description, before anyone
approves. This ledger is the artifact the rules in the SKILL exist to produce.

```markdown
| Test | Class | Reason | Gate 1 no regression | Gate 2 redundant coverage | Gate 3 no label | Gate 4 not flagged | Reviewer |
|------|-------|--------|----------------------|---------------------------|-----------------|--------------------|----------|
| `cart.spec.ts:34 Cart > addItem` | duplicate | Identical signature to `cart.spec.ts:12`; kept copy is the co-located one. | pass (0 fails, 365d) | pass (`src/cart.ts` L12-40 also covered by `cart.spec.ts:12`) | pass | pass | A. Rivera |
| `legacy/report.spec.ts:8 renders` | orphan | Imports `../src/reportBuilder`, deleted in 3f21ac9. | pass | n/a (test cannot run) | pass | pass | A. Rivera |
```

Alongside it, state what the change set does **not** do:

```markdown
**Kept despite classification**

| Test | Class | Why kept |
|------|-------|----------|
| `payment.spec.ts stripe_3ds_failure` | dead-signal | Gate 1 fail: caught a regression 2026-02-12. |
| `auth.spec.ts session_token_rotation` | dead-signal | Gate 3 fail: `@critical:auth-flow`. |
| `parseDate.spec.ts millennium_bug_edge` | dead-signal | Gate 2 fail: only test covering the pre-1970 branch. |
```

The kept table is not filler. It is how a reviewer checks that the gate was
actually run rather than asserted, and it is the record that explains, a year
later, why a quiet test was left alone.

## Expected output shape

A removal pass produces exactly three artifacts:

1. **The removal ledger** (above), one row per proposed removal, each with a
   class, a reason, four gate results, and a named reviewer.
2. **The kept table** (above), every classified candidate that the gate
   stopped, with the failing condition named.
3. **A separate rewrite and fold list**, which are not removals and do not
   ship in the same change set as deletions.

If the pass produces a list of test names with no gate columns and no
reviewer column, it is not a removal proposal. It is a list of suspicions,
and nothing on it is eligible to be deleted.
