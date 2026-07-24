---
name: dr-drill-runner
description: "Author and execute a single DR drill for one service: author the runbook (per-tier RTO + RPO), pre-drill checklist (data sync state, alert silencing, customer comms), drill workflow (announce, fail-over, verify, fail-back) with timestamps, standby verification, failback, and an auditor-ready post-drill report. Per Google Cloud DR planning guide; covers cold / warm / hot standby tier-specific patterns. For coordinating drills across multiple services or teams, use a multi-service drill orchestrator. Use when a scheduled or post-incident failover drill for one service is being planned, executed, or written up, or when a new tier-1 service ships without a drill defined."
metadata:
  keywords: "disaster-recovery, dr-drill, rto, rpo, failover, runbook"
---

# dr-drill-runner

Per the [Google Cloud DR planning guide], DR planning requires
"end-to-end recovery design addressing backup, restoration, and
cleanup procedures." Drills test that the procedure works AND that
the team can run it. Both surface different failures.

## When to use

- Quarterly DR drill (mandatory in compliance-heavy industries:
  banking, healthcare, defense).
- After a region-failover incident: rerun the drill with the
  lessons learned.
- New service onboarding: every new tier-1 service ships with its
  drill defined.

## Step 1 - Define RTO + RPO per service tier

Per the [Google Cloud DR planning guide]:

| Metric | Definition |
|---|---|
| RTO | Maximum acceptable length of time the application can be offline |
| RPO | Maximum acceptable data loss (time window) |

| Tier | Example RTO | Example RPO | Pattern |
|---|---|---|---|
| 1 (revenue-critical) | < 15 min | < 1 min | Hot standby (active-active) |
| 2 (customer-impacting) | < 4 hr | < 1 hr | Warm standby |
| 3 (internal) | < 24 hr | < 24 hr | Cold (rebuild from backup) |

Document per service in a service catalog; drills enforce the
contract.

## Step 2 - DR-pattern tier per service

Per the [Google Cloud DR planning guide]:

- **Cold**: Minimal preparation; recovery requires external
  intervention and extended downtime.
- **Warm**: Basic readiness with resources available; recovery
  stops normal ops temporarily.
- **Hot**: Continuous operation with built-in redundancy; minimal
  interruption.

Drill expectations differ:
- Cold: Test bring-up from backup (Restore-time test - see
  `restore-time-tests` skill).
- Warm: Test failover automation + warm-up time.
- Hot: Test traffic redirection + sticky-session impact.

## Step 3 - Pre-drill checklist

```markdown
## Pre-Drill Checklist - `<service>` `<date>`

- [ ] Drill window scheduled (low-traffic; aligned with
      customer-comm window)
- [ ] Drill scope decided (region, single service, full app)
- [ ] Replication lag confirmed within RPO at T-30 min
- [ ] Monitoring alerts SILENCED for expected failure indicators
      (alert routing redirected to drill channel)
- [ ] On-call notified (avoid duplicate paging during drill)
- [ ] Customer comms sent if customer-impacting drill
- [ ] Rollback path documented (what triggers abort?)
- [ ] Drill commander assigned (owns go/no-go calls)
- [ ] Postmortem time scheduled (within 48hr of drill end)
```

Skipping the pre-drill = drills become incidents.

## Step 4 - Drill workflow

```markdown
## Drill Workflow

### T-0: Announce
- Post in #drill-channel; confirm all participants ready.
- Drill commander gives "GO" - record T-0 timestamp.

### T+0..N: Fail-over
- Execute the runbook step-by-step (everyone follows the doc; no
  improvisation).
- Capture timestamp of each step.

### Verify
- Run the verification suite (smoke + customer-impact + data integrity).
- Compare actual vs expected RTO; if RTO breached, decide:
  abort + rollback, or continue + capture learning.

### Fail-back
- If hot/warm: redirect traffic back to primary.
- If cold: tear down DR environment + restore primary.
- Verify primary is healthy before claiming drill complete.

### Cleanup
- Re-enable alerts (Step 3).
- Send "all clear" customer comms.
- Reconcile any drill-introduced data divergence.
```

## Step 5 - Post-drill report

```markdown
## Drill Report - `<service>` `<date>`

**Drill objective:** Verify warm standby fails over within RTO 4hr.

**Timeline:**
- T-30 min: Replication lag verified (52s - within RPO 1hr) ✓
- T-0: Announced, on-call silenced
- T+12m: Failover initiated
- T+47m: Standby took traffic
- T+1h22m: Verified service healthy on standby
- T+2h11m: Failback to primary
- T+3h05m: Drill complete

**RTO observed:** 1h22m (target: 4hr) ✓

**Issues found:**
1. CRITICAL: DNS TTL was 24hr in standby DNS records; users
   couldn't reach service for 23min after failover. Fix: lower
   TTL to 60s in standby zone before next drill.
2. MAJOR: Secret-manager copy step was undocumented; commander
   improvised. Fix: add Step 3.4 to runbook.
3. MINOR: One alert wasn't silenced in advance; on-call was paged.

**Action items (with owners + dates):**
- DNS TTL fix → @platform-team - 2026-05-20
- Runbook Step 3.4 → @sre - 2026-05-13
- Alert routing audit → @sre - 2026-05-13

**Next drill:** 2026-08-06 (quarterly cadence).
```

## Step 6 - Cold-tier-specific drill pattern

Cold drills = bring up from backup. Verifies:

- Backup is current within RPO (cross-ref `backup-verification-author`).
- Restore time is within RTO (cross-ref `restore-time-tests`).
- Infrastructure-as-code provisioning works (Terraform / CloudFormation /
  Bicep in DR account).
- Permissions + secrets are in place (per the [Google Cloud DR
  planning guide], "Permission and access validation in DR
  environments" + "Security synchronization").

## Step 7 - Hot-tier-specific drill pattern

Hot drills = redirect traffic between active replicas. Verifies:

- Health check propagation (load balancer detects standby is
  healthy).
- Sticky-session handling (do connections drain or break?).
- Cache warmup not required (or warmup time is within RTO).
- Cross-region replication lag stays within RPO during the drill.

## Step 8 - Cadence

| Tier | Cadence |
|---|---|
| 1 | Monthly (game-day style) |
| 2 | Quarterly |
| 3 | Annually |

Per the [Google Cloud DR planning guide]: "test it regularly,
noting any issues." Without cadence, runbooks rot.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Skip pre-drill checklist | Drill becomes incident | Step 3 mandatory |
| One person knows the runbook | Bus-factor 1; drill panics when they're out | Rotate drill commander |
| Skip post-drill report | Lessons lost; same issues recur | Step 5 mandatory + 48hr deadline |
| Test failover only; skip failback | Failback is the actual prod path; bugs hide | Step 4 covers both |
| Lower RTO target after a missed drill | Goalpost moving | Hold the line + invest in fixes |

## Limitations

- DR drills don't replace chaos engineering (`qa-chaos`) - they test rehearsed paths; chaos tests unrehearsed ones.
- Cloud-managed services may have built-in regional failover that
  bypasses your runbook; document boundaries.
- Some compliance regimes (FFIEC for banks) prescribe specific
  drill frequencies + scopes - verify per regulation.

## References

- [Google Cloud DR planning guide] - RTO / RPO / cold-warm-hot
  tiers / testing requirements
- `backup-verification-author`,
  `restore-time-tests` - sister
  skills for drill prerequisites
- `error-budget-tests`,
  `mttr-mtbf-tracker` - incident
  metrics fed by drills

[Google Cloud DR planning guide]: https://docs.cloud.google.com/architecture/dr-scenarios-planning-guide
