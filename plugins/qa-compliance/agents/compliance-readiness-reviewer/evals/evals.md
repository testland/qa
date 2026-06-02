---
component: compliance-readiness-reviewer
type: agent
archetype: A3
---

# compliance-readiness-reviewer - evals

Companion eval cases for [`compliance-readiness-reviewer`](../../compliance-readiness-reviewer.md).
Three cases cover happy path / branch / adversarial: a HIPAA Security Rule
review with a missing audit-log criterion (verdict `NOT READY`), a SOC 2
Type II suite that meets all criteria (verdict `READY`), and an
unjustified N/A scope exclusion refusal (Step 6 refuse-to-proceed). Re-run
by feeding the **Input** block as the first user message and checking the
agent's output against the **Pass condition**.

Target models for re-runs: `sonnet`, `haiku`, `opus`. Dates recorded below
are the eval-authoring date - each case is designed to be reproducible
against any tier.

## Eval 1 - happy path - HIPAA missing audit logging (NOT READY)

**Input:**

```
Run a compliance readiness review.

Target framework: HIPAA Security Rule (45 CFR §164 Subpart C).
Scope: Business Associate handling ePHI for clinical-trial vendor.

Test suite inventory (tests/):
  tests/test_role_access.py            (§164.308(a)(3) — workforce access)
  tests/test_training_required.py      (§164.308(a)(5) — workforce training)
  tests/test_device_wipe.py            (§164.310(d)(2) — device disposal)
  tests/test_unique_user_id.py         (§164.312(a)(1) — access control)
  tests/test_mfa_required.py           (§164.312(a)(1) — access control)
  tests/test_phi_modify_audited.py     (§164.312(c)(1) — integrity)
  tests/test_https_required.py         (§164.312(e)(1) — transmission)

evidence/ files: cc6_1.json (last 90 days), training-records-2026Q1.json.

Scope-exclusion document (scope.yml):
  - criterion: §164.504(e)
    reason: "Single-purpose BA service; full BAA-scope test redundant."
    approved_by: compliance@example.com
    re_review_date: 2026-10-15

Notes:
  - test_device_wipe.py asserts device is wiped but does NOT assert
    NIST 800-88 method.
  - test_https_required.py asserts redirect to HTTPS but does NOT assert
    cipher_strength >= 256.
  - No test or evidence exists for §164.312(b) (audit logging) — that
    control is unimplemented.
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25), opus (2026-05-25)

**Expected:** Step 1 resolves HIPAA criteria set. Step 3 scores
§164.308(a)(3), §164.308(a)(5), §164.312(a)(1), §164.312(c)(1) as
`Covered`; §164.310(d)(2) and §164.312(e)(1) as `Partial`;
§164.312(b) as `Missing`; §164.504(e) as `N/A` (all four fields
present). Step 5 emits the coverage matrix. Step 6 refuses to mark
`READY` because §164.312(b) is `Missing` and the audit-trail criterion
must not be skipped in HIPAA (per the explicit refuse-to-proceed rule).
Verdict: `NOT READY`. Action items name audit-log emission, NIST 800-88
assertion, and cipher-strength assertion.

**Pass condition:** Output contains the literal string `NOT READY` AND
the literal string `§164.312(b)` (or `164.312(b)`) AND the literal
string `Missing` AND at least one of `audit log`/`audit logging`.
Output does NOT contain a verdict line of `READY` (without the `NOT`
qualifier).

## Eval 2 - branch - SOC 2 CC suite fully covered (READY)

**Input:**

```
Run a compliance readiness review.

Target framework: SOC 2 (Common Criteria CC1–CC9).
Scope: SaaS provider; Type II observation period start 2026-06-01.

Test suite inventory (tests/soc2/):
  All 35 CC criteria have a dedicated test_cc<N>_<sub>.py file, each
  with at least one passing assertion in the last 7 days (CI run log
  attached). Examples:
    test_cc1_1_integrity_ethics.py
    test_cc2_3_communication_of_objectives.py
    test_cc4_1_monitoring.py
    test_cc6_6_boundary_protection.py
    test_cc7_4_incident_response.py
    test_cc8_1_change_management.py
    test_cc9_1_risk_identification.py
  (... 28 others, one per CC sub-criterion.)

evidence/ files: per-criterion JSON collected daily for 90 days, all
present, no gaps.

Scope-exclusion document (scope.yml):
  - criterion: CC1.2 (board structure)
    reason: "Single-member LLC; no board exists per company structure."
    approved_by: ciso@example.com
    re_review_date: 2027-01-01

Audit-trail tests (§ for SOC 2 CC7 logging): present —
test_audit_log_append_only.py + test_audit_log_hash_chain.py both
passing in CI for the last 30 days.
```

**Target models:** sonnet (2026-05-25), opus (2026-05-25)

**Expected:** Step 1 resolves SOC 2 CC1 - CC9. Step 3: 34 criteria `Covered`,
1 `N/A` (CC1.2 with all four required fields), 0 `Partial`, 0 `Missing`.
Step 5 emits the coverage matrix. Step 6 finds no refusal trigger (no
missing criteria, N/A is fully justified, audit-trail criterion is
covered). Verdict: `READY` (or equivalent `✅`-marked ready line per
agent's Step 5 verdict format). Pre-audit dry-run pattern (Step 7) may
be mentioned in recommendations.

**Pass condition:** Output contains the literal string `READY` AND does
NOT contain `NOT READY` AND does NOT contain a `❌ Missing` row in any
emitted matrix. Output mentions either `0 missing` / `no missing
criteria` / `all CC criteria covered` (one of these phrasings).

## Eval 3 - adversarial - unjustified N/A scope exclusion (refuse)

**Input:**

```
Run a compliance readiness review.

Target framework: PCI DSS v4.0.
Scope: payments microservice handling card-not-present transactions.

Test suite inventory (tests/pci/):
  test_req2_secure_config.py
  test_req4_tls_in_transit.py
  test_req6_secure_development.py
  test_req8_authentication.py
  test_req10_audit_logging.py

Scope-exclusion document (scope.yml):
  - criterion: Req 3 (protect stored cardholder data)
    reason: "We don't store cards."
  - criterion: Req 11 (test security systems)
    reason: "Out of scope."
    approved_by: dev-lead@example.com

Notes:
  - Req 3 exclusion is missing approved_by AND re_review_date.
  - Req 11 exclusion is missing re_review_date AND the reason is the
    literal string "Out of scope." with no substantive justification.
  - Req 1, 5, 7, 9, 12 have no tests and no scope-exclusion.
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25)

**Expected:** Step 6 refuses to accept either N/A entry because they lack
the four mandatory fields (criterion, reason, approver, re-review date).
Step 6 also refuses to mark `READY` because Req 1, 5, 7, 9, 12 are
`Missing` (no test + no evidence + no scope exclusion). The agent emits
a verdict of `NOT READY` and an action-items list demanding (a) a valid
scope-exclusion document for Req 3 and Req 11 with all four fields, and
(b) implementations or scope-exclusions for Req 1, 5, 7, 9, 12. Cites
the "Reject any N/A without all four required fields" rule from Step 6.

**Pass condition:** Output contains the literal string `NOT READY` AND
references at least two of `re_review_date` / `re-review date` /
`approved_by` / `approver` / `four required fields` AND names at least
one of the unaddressed requirements (one of `Req 1`, `Req 5`, `Req 7`,
`Req 9`, `Req 11`, `Req 12`, `Req 3`). Output does NOT contain a bare
`READY` verdict (without the `NOT` qualifier).

## Reproducibility notes

- All three inputs are concrete pasted-content blocks - no external
  fixtures, no need to clone an evidence repository.
- Pass conditions are literal-string checks; a reviewer can grep the
  agent's transcript for each substring.
- The agent's tool surface (`Read`, `Grep`, `Glob`, narrow
  `Bash(jq *)`) is read-only - eval re-runs cannot modify scope
  documents, test files, or evidence artifacts.
- Eval cases were authored 2026-05-25 against the v4.0 framework's D7
  sub-checks (Evals exist, Multi-model coverage, Acceptance criteria,
  Adversarial coverage, Reproducibility).
