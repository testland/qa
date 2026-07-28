# Worked example

Service `checkout-api`, release `v1.4.5`, single service, no cross-team
dependencies.

**Baseline recorded at 13:55 UTC, 60-minute window:** 5xx rate 0.31 percent,
p95 latency 240ms, checkout completion 92.1 percent, distinct error signatures 41.

**Phase 1, pre-flight.**

| Check | Verdict | Evidence |
|---|---|---|
| CI green on `release/v1.4.5` | PASS | `gh run list --branch release/v1.4.5 --limit 1`, run 8841 green |
| Blocking issues closed | PASS | `gh issue list --label blocker --milestone v1.4.5` returns 0 |
| Migration dry run | PASS | `migration-dry-run` artifact at `abc123` |
| Last known good retrievable | PASS | Artifact `checkout-api:1.4.4` |
| Baseline recorded | PASS | Values above, 12:55 to 13:55 UTC |
| Promote owner available | PASS | Priya, 14:00 to 17:00 UTC |

**Phase 2, smoke gate.** `npm run smoke -- --target=staging`, 4m32s, 22 tests,
0 failures. PASS.

**Phase 3, canary.** 5 percent traffic from 14:33, 30-minute window, labelled
in the runbook as smoke coverage rather than a bake. Table as shown in phase 3
above: all four thresholds green, two new error signatures observed.

```text
NullPointerException at Cart.addItem:42   1 occurrence, absent from control
RateLimitExceeded                          1 occurrence, present in control at similar rate
```

Verdict: **PROCEED WITH CAUTION**. The rate-limit signature also appears in the
control, so it is not attributable to the change. The null-pointer signature is
absent from the control population and is therefore a real delta, below every
threshold.

**Phase 4, promote gate.** Priya, 15:05 UTC, chose `continue`, on the evidence
of the canary table plus the two signatures. The null pointer became follow-up
item 1.

**Phase 5, rollout.** 25 percent at 15:08, observed 20 minutes, ratios within
widened limits. 100 percent at 15:30.

**Phase 6, post-release.** 60-minute window to 16:30 against the 13:55
baseline: 5xx 0.33 percent (1.06x), p95 244ms (1.02x), checkout completion 92.0
percent (1.00x). Stable. Tag, changelog, and notification issued at 16:32.
Follow-ups: the null pointer, plus a runbook defect - a 30-minute canary was too
short to accumulate enough occurrences of the new signature for the promote gate
to judge it confidently, so the canary window for this service moves to 60
minutes.
