# Severity and priority classification scales

Deep reference for the `bug-report-template` SKILL.md. Consult when filling the
Severity and Priority fields in Step 5 - the two are scored independently.

Per ISO/IEC/IEEE 29119-3:2021 (incident-report content; cite by stable standard
ID - the spec is paywalled at iso.org but the field semantics are widely
adopted).

## Severity - intrinsic impact

Severity describes what the defect does to the user when it manifests,
independent of business prioritization:

| Severity | When to use                                                       |
|----------|-------------------------------------------------------------------|
| Critical | Crash / data loss / security breach / business-stopping outage.  |
| Major    | Important feature unusable; workaround exists but is significant. |
| Moderate | Degraded UX in a non-critical surface; minor data inconsistency. |
| Minor    | Cosmetic, typo, label-only issue.                                 |

## Priority - extrinsic business order

Priority describes when the team plans to fix:

| Priority | When to use                                                       |
|----------|-------------------------------------------------------------------|
| P0       | Drop everything; fix now; usually paired with Severity Critical. |
| P1       | Fix in the current sprint / cycle.                                |
| P2       | Fix in the next planning cycle.                                   |
| P3       | Backlog; fix opportunistically.                                   |

## The two are independent

A Critical-severity bug for one user might be P2 if the user is non-paying; a
Minor-severity bug on the marketing homepage might be P0 if launch is tomorrow.
Score severity from the defect's impact on the user; let the PM / engineering
decide priority from business context.
