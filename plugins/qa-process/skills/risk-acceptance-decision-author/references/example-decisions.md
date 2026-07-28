# Worked example decision documents

Deep reference for the `risk-acceptance-decision-author` SKILL.md, Step 5. Two filled decision documents assembled from the Step 1-4 fields: a cost-justified acceptance (PR-008) and a high-score S4 security acceptance (R-99) that shows a score >= 15 can still be legitimately accepted with executive sign-off.

## Example 1 - cost-justified acceptance (PR-008)

```markdown
# Risk acceptance decision - PR-008

**Risk:** Legacy CSV import endpoint accepts files up to 500MB
without streaming
**Risk register entry:** [PR-008 in product-risk-register-builder/SKILL.md](...)
**Score (current):** 9 (impact 3 × likelihood 3)
**Decision:** Accept
**Decided:** YYYY-MM-DD  **Decided by:** <names>

## Rationale

CSV import endpoint is used by ~12 customers monthly. Migration to
streaming parser would require:
- 2 sprint-weeks engineering effort
- Backwards-compat shim for 6 months
- Customer comms for any behavioural change

Expected loss analysis:
- OOM event probability in next year: ~15% (based on similar
  endpoints at peer companies)
- Per-event cost: 1 hour of P2 on-call + customer remediation
  (~$2k total)
- Annualised expected loss: ~$3.6k

Mitigation cost: ~$40k (engineering time + opportunity cost).

Acceptance is cost-justified. Compensating control: existing
Kubernetes memory-limit + OOM-killer logs trigger an on-call
alert within 30 seconds; rerun + fix process takes <15 minutes.

## Scope

This acceptance covers releases v3.0 through v3.6 (Q2 2026 - Q4
2026) inclusive. Re-review trigger conditions below.

## Sign-off

- Engineering manager: <name> ✓ YYYY-MM-DD
- QA lead: <name> ✓ YYYY-MM-DD

## Review triggers

Reopen this decision if ANY of:

1. **Time:** End of Q4 2026 (default review).
2. **Score change:** If likelihood rises to 4+ for any reason - 
   e.g., increased CSV-import customer volume.
3. **Incident:** Any production OOM event traced to this
   endpoint.
4. **Architectural:** If the CSV import endpoint moves out of
   deprecation (currently planned for v4.0 deprecation).
5. **Customer pressure:** If a customer formally requests
   streaming support.

## Compensating controls

- Kubernetes memory limit: 1Gi per pod (auto-OOM-kill at limit)
- Datadog monitor: `csv-import-oom-rate` - alert on any OOM
- Runbook: [`csv-import-oom-runbook`](runbooks/csv-import-oom.md)
- On-call SLA: 30s detection, 15min remediation

## History

- YYYY-MM-DD: Decision authored (this document)
- (future review entries logged here)
```

## Example 2 - high-score S4 security acceptance (R-99)

Some risks score high (>= 15) but acceptance is still legitimate. Example: a known-exploitable but rate-limited internal endpoint.

```markdown
# Risk acceptance decision - R-99 (Security)

**Risk:** Internal admin endpoint vulnerable to CSRF (low-likelihood
because authenticated session required, network-segmented)
**Score:** 15 (impact 5 × likelihood 3)
**Decision:** Accept

## Rationale

CSRF on internal admin endpoint. Likelihood 3 because:
- Requires authenticated admin session (auth-gated)
- Network-segmented to office VPN + on-prem only
- No external internet exposure

Mitigation = CSRF token rotation across 47 admin endpoints. Effort:
3 sprint-weeks. Risk reduction: likelihood 3 → 1.

Accepting because:
- Network segmentation already a compensating control
- Mitigation work would delay v3.0 launch by 3 weeks
- Q3 2026 already scheduled for admin-endpoint hardening

## Sign-off

- CISO: <name> ✓
- VP Engineering: <name> ✓
- Security review board: minutes attached

## Review trigger

- **Time:** End of Q3 2026 (when admin-endpoint hardening
  scheduled)
- **Score:** Any external internet-facing exposure of these
  endpoints
- **Incident:** Any CSRF attempt observed in logs
```
