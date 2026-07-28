# CI failure triage anti-patterns

Each row is a classification that routes work to the wrong place, why it fails,
and the rule in the method that prevents it.

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Calling every async-wait timeout a flake | Some are real: the new code path made the product slower. | R3 outranks R5 whenever S6 shows change-set proximity. |
| Calling any test that ever flaked `flaky-known` | Conflates a formally quarantined test with one that is merely intermittent, and hides the second class entirely. | R1 fires only on a structured quarantine artifact. |
| Inferring quarantine status from comments | "This test sometimes fails" in a comment is noise, not a decision anyone made. | S7 counts annotations, decorators, CI tags, and checked-in lists only. |
| Verdict on a single failure with no history | One data point cannot separate a flake from a defect. | Without S2, R3 and R5 cannot be evaluated at all; say so and mark confidence low rather than picking. |
| Classifying `environment-drift` as `defect` because the test is red | Routes to the wrong team and fills the defect tracker with false positives. | R2 is evaluated before R3. |
| Triggering a rerun as part of classifying | Reruns change the evidence you are classifying, and Google notes that automatic reruns train developers to ignore real failures (Google 2016). | Recommend the rerun in the verdict; do not perform it during triage. |
| Classifying from commit subjects instead of the diff | The hypothesis becomes unfalsifiable, and S6 is unsatisfied. | Read the change (Google eng-practices), or mark S6 unevaluated. |
| Stacking two verdicts | "Probably a flake and maybe a defect" routes nowhere and nobody owns it. | Single-valued by construction: the earliest matching rule wins. |

## References

- Google 2016 - "Flaky Tests at Google and How We Mitigate Them": https://testing.googleblog.com/2016/05/flaky-tests-at-google-and-how-we.html
- Google Engineering Practices, code review: https://google.github.io/eng-practices/review/reviewer/looking-for.html
