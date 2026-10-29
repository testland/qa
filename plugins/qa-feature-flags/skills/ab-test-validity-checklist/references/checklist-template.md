# Validity checklist and sign-off template

Copy to `experiments/<id>/checklist.md` at pre-registration and fill in
each section as the experiment moves through
[SKILL.md](../SKILL.md) Steps 1-7. Every ticked box needs its evidence
next to it (a number, a query link, or a calculation). The SRM
threshold follows Microsoft ExP's p < 0.0005 ([ExP SRM article][srm]).

```markdown
# Experiment <id> - Validity Checklist

## Pre-registration (signed by: <owner>, date: <YYYY-MM-DD>)

- [ ] OEC declared: <metric>
- [ ] Power calc: N=<X>, alpha=0.05, beta=0.20, MDE=<Y>%
- [ ] Guardrails declared: <list with thresholds>
- [ ] Randomization unit: <user_id / device_id>
- [ ] Allocation: <50/50>
- [ ] Look schedule: <Pocock 5 looks at days 2,4,7,10,14>
- [ ] Stop-early rules: <on OEC reaching alpha-threshold>

## During experiment

- [ ] SRM check: chi-square p >= 0.0005 ([result: <p>])
- [ ] Assignment integrity tests passing
- [ ] Telemetry validated

## Post-experiment (signed by: <reviewer>, date: <YYYY-MM-DD>)

- [ ] Pre-registration honoured (no scope changes)
- [ ] SRM final check: p >= 0.0005 ([result])
- [ ] OEC significant (p=<X>; method: <Pocock>)
- [ ] All guardrails within thresholds:
   - api_p95_latency: +<X>% / +<Y>ms - <status>
   - dau: <X>% - <status>
- [ ] Multiple-comparison adjusted (method: <Bonferroni / BH>)
- [ ] Novelty assessment: effect persists week 2+? <yes / no>
- [ ] Segment stability: direction consistent? <yes / no>
- [ ] Trust metric stable? <yes / no>

## Ship decision: <ship / no-ship / extend>

Reasoning: <one paragraph>

Sign-off: <name>, <date>
```

The reviewer who signs the post-experiment section is not the
experiment owner.

[srm]: https://www.microsoft.com/en-us/research/articles/diagnosing-sample-ratio-mismatch-in-a-b-testing/
