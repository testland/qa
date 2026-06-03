---
name: post-mortem-author
description: "Build-an-X workflow that produces a blameless post-mortem from an incident - captures the timeline (chronological event sequence with sources), root cause analysis (what + why, not who), impact (users / revenue / SLO debt), action items (with owners + due dates + measurable success criteria), and \"what went well\" (intentional). Per Google SRE: \"Blameless postmortems are a tenet of SRE culture.\" Use after every user-visible incident, not just severe ones."
rating: 23
d6: 4
---

# post-mortem-author

## Overview

Per [google-sre-postmortem][gsp]:

[gsp]: https://sre.google/sre-book/postmortem-culture/

> "A postmortem is **'a written record of an incident, its impact,
> the actions taken to mitigate or resolve it, the root cause(s),
> and the follow-up actions to prevent the incident from
> recurring.'**"

> "Blameless postmortems are a tenet of SRE culture."
> ([google-sre-postmortem][gsp])

> "Writing a postmortem is not punishment - it is a learning
> opportunity for the entire company." ([google-sre-postmortem][gsp])

The blameless framing is load-bearing. Per
[google-sre-postmortem][gsp], the document must "focus on
identifying the contributing causes of the incident without
indicting any individual or team for bad or inappropriate
behavior" - assuming "everyone involved in an incident had good
intentions and did the right thing with the information they
had."

## When to use

Per [google-sre-postmortem][gsp], common triggers include:

> "user-visible downtime, data loss, on-call interventions,
> extended resolution times, and monitoring failures."

Author a post-mortem after every such incident - not just sev-1.
Lower-severity incidents accumulate context that prevents the
sev-1.

## Step 1 - Document structure

```markdown
# Post-mortem — `INC-1234` — Stripe webhook delivery failure

**Status:** Draft | Review | Approved | Action items closed
**Severity:** SEV-2
**Authors:** Alice (incident commander), Bob (lead investigator)
**Date authored:** YYYY-MM-DD   **Incident date:** YYYY-MM-DD
**Reviewers:** Eng manager, SRE lead, Product

## Summary

(2-3 sentences: what happened, who was affected, how long, what was done.)

## Impact

- **Users affected:** ~12,400 customers (4.3% of MAU) experienced
  failed checkout completions.
- **Revenue impact:** ~$140,000 in delayed orders (deferred, not
  lost).
- **SLO debt:** Burned 32% of monthly availability budget.
- **Reputational:** 47 support tickets; 3 social media complaints
  with low reach.

## Timeline

(Chronological events with timestamps + source links.)

| Time (UTC) | Event                                                            | Source            |
|------------|------------------------------------------------------------------|-------------------|
| 14:00      | Deploy of v1.4.5 to canary (5% traffic)                          | CD pipeline log    |
| 14:08      | Canary metrics begin trending; error rate at 0.4% (baseline 0.3%) | Datadog dashboard |
| 14:23      | First Sentry alert: NullPointerException at WebhookHandler:42    | Sentry            |
| 14:30      | Canary observation window ends; metrics within thresholds; promoted to 100% | CD pipeline |
| 14:35      | Error rate climbs to 1.2% across all traffic                      | Datadog            |
| 14:42      | PagerDuty alert: SLO burn rate                                    | PagerDuty          |
| 14:45      | Incident declared SEV-2; Alice on-call IC                         | #incidents        |
| 14:47      | Bob identified the WebhookHandler regression in v1.4.5            | Sentry trace       |
| 14:51      | Rollback initiated                                                | CD pipeline        |
| 14:58      | Rollback complete; error rate returning to baseline                | Datadog            |
| 15:15      | Incident closed; metrics normal                                    | #incidents        |

**Total user-visible duration:** 23 minutes (14:35–14:58).

## Root cause

(What happened, in detail. **Not who.**)

The WebhookHandler in v1.4.5 introduced a new code path for
handling Stripe's `payment_intent.partially_funded` event type.
The path called `payment.metadata.get("internal_id")` — but for a
small subset of events (~3%), `metadata` was null. The
NullPointerException was uncaught; the handler returned 500;
Stripe retried up to 3 times then marked the webhook as failed;
order fulfillment didn't trigger.

The canary stage caught the increased error rate (0.4% vs 0.3%
baseline) but did not exceed the rollback threshold (1.5×
baseline). Per [`prod-canary-validator`](../../qa-shift-right/skills/prod-canary-validator/SKILL.md),
the verdict was PROCEED with WARNING; the human ack at the gate
proceeded.

## Contributing factors

(All the conditions that allowed the incident.)

1. **Test gap:** The new event type was added without a unit test
   for the null-metadata case.
2. **Canary threshold:** The 1.5× baseline rule passed despite
   a clear trend; thresholds may be too lenient.
3. **No staging traffic:** Stripe webhook events on staging are
   minimal; the new event type wasn't exercised pre-deploy.

## What went well

(Per [google-sre-postmortem][gsp]: post-mortems should also call
out positives — what mitigated faster than expected.)

1. Sentry caught the regression at 14:23 — well before the
   PagerDuty alert at 14:42.
2. Rollback completed in 7 minutes; well within RTO.
3. Bob identified the root cause from the Sentry stack trace
   alone — no production debugging needed.

## Action items

| ID | Action                                                            | Owner    | Priority | Due       | Success criterion                                              |
|----|-------------------------------------------------------------------|----------|----------|-----------|---------------------------------------------------------------|
| AI-1 | Add unit test for partially_funded with null metadata            | Bob      | P1       | 2 days    | Test exists in `WebhookHandlerTest.kt` + CI passes against the bug. |
| AI-2 | Tighten canary error-rate threshold from 1.5× to 1.3×             | SRE      | P2       | 1 sprint  | `canary-thresholds.yml` updated; one normal canary passes.    |
| AI-3 | Add Stripe-event-type fixture for staging that covers all event types | Bob | P2       | 1 sprint  | Staging metric "events processed by type" shows all types > 0. |
| AI-4 | Add per-event-type metric in production                            | SRE      | P3       | 2 sprints | Datadog dashboard shows per-event-type error rate.            |

## Lessons learned

(What we know now that we didn't before.)

- The canary verdict's relative threshold (1.5×) is too forgiving
  for low-baseline error rates. A 0.3% baseline with a 1.5× rule
  permits 0.45%, which is a meaningful regression at scale.
- Staging-side webhook coverage is a known gap (Stripe doesn't send
  test events for all types). Pre-deploy testing against the full
  event-type matrix needs explicit fixturing.

## Postmortem trigger

Per the team's incident triggers (cross-reference team's runbook),
this incident qualified because:

- User-visible: ✅ (failed checkout flows)
- Duration: ✅ (>10 min)
- Revenue impact: ✅ (>$10k)
- SLO impact: ✅ (>10% monthly budget)
```

## Step 2 - Blameless review

Per [google-sre-postmortem][gsp]: "Postmortems are not punishment."

Reviewers should:

- **Reject blame language.** "Bob deployed without testing" → "The
  pre-deploy testing didn't cover the null-metadata case."
- **Focus on systems, not individuals.** "Why did Bob fix this
  fast?" → "What enabled fast diagnosis? (Sentry stack trace +
  the team's incident-response training.)"
- **Surface contributing factors openly.** Multiple factors usually
  contribute; document all.

## Step 3 - Action item discipline

Action items must have:

- **Owner** (one named person; not "the team").
- **Due date** (concrete; not "next sprint when we have time").
- **Priority** (P0/P1/P2/P3; ties to the action's importance).
- **Success criterion** (measurable; "X done" not "we'll think about X").

The action items are the post-mortem's value. Without them, the
document is paperwork.

## Step 4 - Approval + closure

The post-mortem isn't "done" until:

1. Reviewers (eng manager, SRE lead, Product) sign off.
2. Action items are added to the team's tracker (Jira / Linear /
   GitHub issues).
3. P1/P2 action items have a target completion before the next
   release.

The post-mortem is "closed" when all action items ship - typically
2-4 weeks. A 6-month-old open post-mortem is a process failure.

## Step 5 - Storage

```
docs/postmortems/
├── INC-1234-stripe-webhook-2026-05-04.md
├── INC-1235-cache-invalidation-2026-05-12.md
├── INC-summary-2026-Q2.md       ← rollup
└── README.md
```

Markdown + git. Quarterly rollup identifies patterns:

```markdown
## Q2 2026 incident summary

**Total incidents:** 12
**SEV-1:** 1
**SEV-2:** 6
**SEV-3:** 5

**Patterns:**
- 4 of 12 (33%) were "test gap" — the failing condition wasn't
  in the test suite. Action: invest in
  [`unit-test-coverage-targeter`](../../qa-test-reporting/skills/unit-test-coverage-targeter/SKILL.md)
  + property-based testing.
- 3 of 12 (25%) involved canary metrics; 2 of those proceeded
  through canary gate. Action: review thresholds (per AI-2 from
  INC-1234).
- ...
```

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Blame language                                                         | Defeats the blameless principle; team stops authoring post-mortems honestly. | Per Google SRE: focus on contributing causes, not individuals (Step 2). |
| Action items without owner / due date                                  | Nobody acts; same incident recurs.                                       | All four fields required (Step 3). |
| Skipping post-mortems for "small" incidents                            | Lower-severity context that prevents big incidents is missed.            | Author per [google-sre-postmortem][gsp] trigger criteria (Step 1). |
| Post-mortem stored in private docs                                     | Org learning capped at the team.                                         | Public to org (per Google SRE pattern). |
| One-shot post-mortem with no follow-up                                  | "Closed" but action items stale; recurrence likely.                      | Track action items in tracker (Step 4); post-mortem closed only when all done. |
| Post-mortem authored 2+ weeks after incident                           | Memory faded; details lost.                                              | Author within 5 business days. |

## Limitations

- **Honesty depends on culture.** A team that fears blame will
  produce sanitized post-mortems. Leadership must reinforce
  blamelessness in word and action.
- **Post-mortems don't prevent the next incident.** They prevent
  the same class of incident. Pair with proactive practices
  (chaos testing, threat modeling).
- **Time investment.** A SEV-2 post-mortem typically takes 4-8
  hours to author + 2-4 hours of review. Budget accordingly.

## References

- [gsp][gsp] - Google SRE blameless post-mortem definition,
  triggers, blamelessness principle, learning-opportunity framing.
- [`release-readiness-checker`](../../agents/release-readiness-checker.md) - sibling: pre-release gate; post-mortems feed back to update
  the gate criteria.
- [`prod-canary-validator`](../../qa-shift-right/skills/prod-canary-validator/SKILL.md) - sibling: canary verdict; post-mortems often surface threshold
  tuning needs.
- [`observability-to-test`](../../qa-shift-right/agents/observability-to-test.md) - agent that turns post-mortem action items into regression tests.
