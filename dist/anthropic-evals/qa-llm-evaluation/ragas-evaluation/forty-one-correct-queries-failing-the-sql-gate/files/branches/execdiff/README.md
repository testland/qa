# Branch `spike/execdiff` - Y. Bensalem, 2026-09-11

Stop comparing query text. Run both queries, sort both result sets, diff them.
If they match, the model wrote the same query the data team wrote, whatever it
looks like. If they do not, it did not.

Runs against `fixtures/dev-snapshot`, which is already in CI, so this costs a
few seconds a PR and never touches production.

I also folded in the two house rules from `docs/query-house-rules.md` so the
auditors have something to point at. `house_rules_ok` is in `execdiff.py`.

## Run output

```
$ python -m eval.execdiff --cases data/sql_cases.jsonl
2026-09-11 09:02  run 1  46/50 pass   fail: q-19, q-27, q-33, q-40
2026-09-11 15:47  run 2  47/50 pass   fail: q-19, q-27, q-33
2026-09-12 08:20  run 3  46/50 pass   fail: q-19, q-27, q-33, q-40
```

9 of 50 to 46 of 50, and the four that fail are four things we genuinely want
to know about.

q-40 comes and goes between runs and I have not chased it down yet; I would
merge this and look at that separately rather than hold the whole thing up.
