# Rollup and trend reporting

Deep reference for the `test-design-scorecard` SKILL.md. Consult after scoring individual files, when aggregating those scores into a per-PR summary or a per-author trend line. The per-file scoring and feedback rules stay in the SKILL; this is the rollup layer.

## Worked example - per-PR summary

```markdown
## Test design scorecard - PR #1234

**Files scored:** 3
**Average:** 3.8 / 5
**Trend:** up from 3.5 across the previous 3 PRs.

| File | Score | Standout | Top growth axis |
|---|---:|---|---|
| `cart.spec.ts` | 4.2 | Phase separation, single-responsibility | Naming |
| `checkout.spec.ts` | 3.5 | Inline fixtures | Magic literals |
| `payment.spec.ts` | 3.7 | Setup under 1 s | Single-responsibility (3 targets in one test) |

### Pick one focus for this sprint

1. **Naming:** add the scenario element to every new test name.
2. **Single-responsibility:** split tests with 3 or more assertion targets.
3. **Magic literals:** name the values that recur across files.

One focus beats three. Pick the one you would enjoy doing.

### This is not a gate

This PR ships on its own merits. The growth items are for the next one.
```

## Worked example - per-author trend

```markdown
## Test design trend - Q2

| Period | Avg score | PRs scored | Axes |
|---|---:|---:|---:|
| 2026-W18 | 3.5 | 4 | 5 |
| 2026-W19 | 3.7 | 3 | 5 |
| 2026-W20 | 3.8 | 5 | 6 |
| 2026-W21 | 3.9 | 4 | 6 |

**Direction:** up, roughly +0.1 per sprint.
**Most improved:** AAA phase separation, 3.0 to 4.5.
**Unchanged:** setup time, unscored in W18-W19 (no timings captured).
```

## Reporting conventions

Two conventions keep the trend honest, both chosen here rather than sourced:

- Report **no trend** on fewer than **3 scored PRs** in a period.
- Treat a period-over-period delta under **0.3** as noise rather than movement, given the inter-rater reliability limit the SKILL documents.
- Always print the **axis count** per period: a composite over 5 axes and one over 6 are not the same number.

Trends need consistent adoption. Scored sporadically, the line tracks which PRs happened to get reviewed, not how anyone's testing changed. Keep the same scorer across a trend line wherever possible, since a one-point difference between reviewers is inside the noise floor.
