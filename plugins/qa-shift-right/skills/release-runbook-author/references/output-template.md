# Output template

One document. It is the plan before the release and the record after it.

```markdown
# Release runbook - {service} {version}

**Promote-gate owner:** {one named person, availability window}
**Last known good artifact:** {id}
**Recovery rule:** a crossed threshold halts the phase and puts a recovery
decision to {owner}. Recovery may be roll back, roll forward, or redeploy
last known good, and only {owner} chooses which.

## Baseline - recorded {window} before deploy

| Metric | Value | Query |
|--------|-------|-------|

## Thresholds

| Metric | Absolute floor | Ratio limit (canary vs control) | Ratio limit (rollout vs baseline) |
|--------|----------------|----------------------------------|------------------------------------|

## Phase 1 - Pre-flight

| Check | Verdict | Evidence |
|-------|---------|----------|

## Phase 2 - Smoke gate

**Command:** **Environment:** **Duration:** **Result:**

## Phase 3 - Canary  ({share} traffic, {window}, coverage: smoke | bake)

| Metric | Absolute floor | Ratio limit | Control | Canary | Ratio | Verdict |
|--------|----------------|-------------|---------|--------|-------|---------|

**Anomalies below threshold:**
**Verdict:** PASS | PROCEED WITH CAUTION | HALT

## Phase 4 - Promote gate

**Decision:** continue | pause | rollback
**Made by:** **At:** **On this evidence:**
**Acknowledged anomalies carried forward:**

## Phase 5 - Rollout

| Stage | Share | Window | Metrics vs baseline | Verdict |
|-------|-------|--------|---------------------|---------|

## Phase 6 - Post-release

| Metric | Baseline | Observed | Ratio | Verdict |
|--------|----------|----------|-------|---------|

**Administrative tail:** tag / changelog / notification, each with a timestamp.

## Follow-ups

- [ ] {product defects acknowledged at the promote gate}
- [ ] {runbook defects the release exposed}
```
