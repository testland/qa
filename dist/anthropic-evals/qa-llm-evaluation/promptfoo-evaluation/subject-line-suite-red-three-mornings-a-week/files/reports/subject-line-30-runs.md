# Subject-line suite, last 30 weekday runs (2026-08-03 to 2026-09-11)

Command: `npx promptfoo eval -c evals/subject-lines/promptfooconfig.yaml`

Two providers, four campaign cases, so 60 case-runs per campaign case across
the 30 runs.

| Case                                     | Assertion         | Fails / 60 |
|------------------------------------------|-------------------|------------|
| black friday promo                       | equals            | 57         |
| black friday promo                       | is-json           | 0          |
| black friday promo                       | envelopeShape     | 0          |
| black friday promo                       | underSixtyChars   | 0          |
| black friday promo                       | noCompetitorNames | 0          |
| tone matches the brand voice             | levenshtein       | 60         |
| tone matches the brand voice             | is-json           | 0          |
| tone matches the brand voice             | envelopeShape     | 0          |
| tone matches the brand voice             | underSixtyChars   | 0          |
| tone matches the brand voice             | noCompetitorNames | 0          |
| winback nudge mentions the discount      | contains          | 41         |
| winback nudge mentions the discount      | is-json           | 0          |
| winback nudge mentions the discount      | envelopeShape     | 0          |
| winback nudge mentions the discount      | underSixtyChars   | 0          |
| winback nudge mentions the discount      | noCompetitorNames | 0          |
| renewal reminder stays close to the copy | rouge-n           | 46         |
| renewal reminder stays close to the copy | is-json           | 0          |
| renewal reminder stays close to the copy | envelopeShape     | 0          |
| renewal reminder stays close to the copy | underSixtyChars   | 0          |
| renewal reminder stays close to the copy | noCompetitorNames | 0          |

Job-level outcome: 11 of 30 runs red. The 19 green runs are runs where the
`equals`, `contains` and `rouge-n` cases happened to land on wording close
enough to pass. The `levenshtein` assertion on `tone matches the brand voice`
has 0 passes in 60 case-runs.

Outputs recorded for `tone matches the brand voice` (every one of them failed):

```
{"subject":"Your new reporting dashboard is live","preheader":"Take a look."}
{"subject":"Your new reporting dashboard is live!","preheader":"Have a look."}
{"subject":"The new reporting dashboard is live","preheader":"Go and see."}
```

Outputs recorded for `winback nudge mentions the discount`:

```
{"subject":"Come back and save 20% for three months","preheader":"Offer ends Friday."}
{"subject":"20% off your next three months","preheader":"We kept your settings."}
{"subject":"Save 20% if you come back this week","preheader":"Same plan, same price."}
```

No timeouts, no rate limits and no provider errors in any of the 30 runs.
