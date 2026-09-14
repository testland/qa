# Harness notes, Dan

`run.mjs` takes the production reply as the baseline and the new prompt's reply
as the candidate. Variant A is always the baseline, variant B is always the
candidate; that is how the run script is wired and it has not changed since we
built it.

We used to shuffle which reply went first. In August I compared a shuffled run
against a fixed-order run on the same pairs and the shuffled one was visibly
noisier — verdicts moved between runs on pairs that should not have been close.
The fixed-order run was stable and two reruns of it agreed with each other, so
we went with fixed order. The order-check CSV from that comparison is in
`reports/`.

Grader is set once in `promptfooconfig.yaml` under `defaultTest.options.provider`
so nobody can accidentally inherit a default. We picked the larger model on the
grounds that you should not grade with something weaker than the thing you are
grading.
