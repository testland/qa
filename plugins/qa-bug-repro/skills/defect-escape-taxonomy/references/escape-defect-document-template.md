# Escape defect document template

Deep reference for `defect-escape-taxonomy` SKILL.md. Consult when writing up a classified escape - the full per-defect document shape.

One markdown document per escaped defect. Store them together under a
stable directory (for example `docs/escape-defects/`) with a
date-prefixed, slugified filename, so the set can be read as a trend.

```markdown
# Escape defect: <one-line summary of the failure>

| Field | Value |
|---|---|
| Defect ID | #1234 |
| First production observation | 2026-05-02T09:14Z |
| Days in production before fix | 2 |
| Users affected (estimated) | ~340 |
| Fix commit | def5678 |
| Introducing commit | abc1234 |
| Escape category | test gap |
| Sub-pattern | edge case not exercised |

## What happened
Two or three paragraphs. Behavior of the system, in order. No attribution.

## Why it escaped
The checking activity that was supposed to catch this, and the standing
state of that activity. Systems as grammatical subjects throughout.

## Prevention asset
### Proposed test or gate
<actual code or config diff>

### Where it lives
<repository path>

### What it verifies
Names the introducing commit and states when this check would have failed
against it.

## Process changes
Process-gap findings only. Omit the section otherwise.

## Open questions
Anything the available evidence does not settle, stated as a question.
```

The **Prevention asset** section is load-bearing. If it is empty or
generic, the document is not finished.
