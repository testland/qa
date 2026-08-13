# Output template

Produce one document. It is the plan before the window and the record after it.

```markdown
# Release cutover plan - {release_name}

**Window:** {start_utc} to {hard_stop_utc}
**Release authority:** {one named person}
**Hard stop consequence:** reaching {hard_stop_utc} with open gates puts the
full reverse path to the release authority as a decision.

## Rollback rule for this window

Rollback is a decision made by {release authority} on stated evidence.
Thresholds halt the sequence; they do not reverse it. Recovery may be
roll back, roll forward, or redeploy last-known-good, and only the release
authority chooses which.

## Dependency graph

{service -> service edges, one per line}
{parallel tracks listed explicitly}
{preconditions on out-of-window services, each with the person who confirmed it}

## Gate sequence

| Gate | Kind | Step | Depends on | Owner | Timebox (UTC) | Status |
|------|------|------|-----------|-------|---------------|--------|

## Authority table

| Role | Named person | Scope |
|------|--------------|-------|
| Release authority | | all DECISION gates and recovery calls |
| {service} owner | | {gate IDs} execution |

## Rollback triggers

| Gate | Condition that puts a decision on the table | Evaluated by | Evidence | Reverse scope |
|------|--------------------------------------------|--------------|----------|---------------|

## Reverse path

{completed ACTION gates in reverse order, one owner per step,
 confirmation required between steps}
{gates marked POINT OF NO RETURN and what recovery means past them}

## Runtime log

| Time (UTC) | Gate | Action | Verdict | Evidence | Called by |
|------------|------|--------|---------|----------|-----------|
```

Update the `Status` column and append to the runtime log in place as the window
runs. Authority handoffs are log rows. At close, the document is the release
record, and the coupling that forced a coordinated window is worth carrying
into the retrospective.
