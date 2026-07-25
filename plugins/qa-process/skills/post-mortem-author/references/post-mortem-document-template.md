# Post-mortem document template

Deep reference for the `post-mortem-author` SKILL.md. The full per-incident section skeleton to copy when authoring a blameless post-mortem. Fill every section; the **Action items** table is load-bearing - a post-mortem without owned, dated, measurable action items is paperwork.

Store one markdown file per incident under a stable directory (for example `docs/postmortems/`) with an incident-ID-and-date filename.

```markdown
# Post-mortem - `INC-XXXX` - <one-line title>

**Status:** Draft | Review | Approved | Action items closed
**Severity:** SEV-n
**Authors:** <incident commander>, <lead investigator>
**Date authored:** YYYY-MM-DD   **Incident date:** YYYY-MM-DD
**Reviewers:** <eng manager>, <SRE lead>, <product>

## Summary
2-3 sentences: what happened, who was affected, how long, what was done.

## Impact
- **Users affected:** count and % of MAU.
- **Revenue impact:** amount (state deferred vs lost).
- **SLO debt:** % of the monthly availability budget burned.
- **Reputational:** support tickets, social reach.

## Timeline
Chronological events, one row each, with a UTC timestamp and a source link.

| Time (UTC) | Event | Source |
|------------|-------|--------|
| ... | ... | ... |

## Root cause
What happened, in detail. Not who. The system is the grammatical subject.

## Contributing factors
Every condition that allowed the incident (test gap, threshold too lenient,
missing staging traffic, ...). List all; incidents rarely have a single cause.

## What went well
The positives - what mitigated faster than expected. Per
[Google SRE, Postmortem Culture](https://sre.google/sre-book/postmortem-culture/),
post-mortems should call these out too.

## Action items
| ID | Action | Owner | Priority | Due | Success criterion |
|----|--------|-------|----------|-----|-------------------|
| AI-1 | ... | one named person | P0-P3 | concrete date | measurable "done" condition |

## Lessons learned
What the team knows now that it did not before.

## Postmortem trigger
Which trigger criteria this incident met (user-visible, duration, revenue, SLO).
```

Two fields carry the most weight. **Root cause** must read as a property of the
system, never of a person. **Action items** must each have one named owner, a
concrete due date, a priority, and a measurable success criterion; without all
four the item does not get acted on and the same incident recurs.
