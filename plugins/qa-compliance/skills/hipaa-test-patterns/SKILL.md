---
name: hipaa-test-patterns
description: "Reference catalog of HIPAA Security Rule-aligned test patterns - administrative safeguards (45 CFR §164.308: workforce training, access management, contingency planning), physical safeguards (§164.310: facility access, workstation security, device disposal), technical safeguards (§164.312: access control, audit logs, integrity, transmission security); PHI handling assertions in fixtures; minimum-necessary tests per §164.502(b); BAA-scope boundary verification. Use when authoring HIPAA-readiness tests for any product handling Protected Health Information."
---

# hipaa-test-patterns

[hipaa-hhs]: https://www.hhs.gov/hipaa/

Reference catalog of test patterns by HIPAA Security Rule section
(45 CFR §164). Pair with `audit-trail-test-author`
for §164.312(b) audit-log requirements. Anchors:
[hhs.gov/hipaa][hipaa-hhs] and NIST SP 800-66.

## When to use

- Product is a Business Associate handling PHI for a Covered Entity
  (or is itself a Covered Entity).
- BAA (Business Associate Agreement) signed; need test evidence.
- HIPAA risk assessment requires test coverage evidence.
- New feature touches PHI (medical records, billing, scheduling,
  clinical decision support).

## What is PHI?

Per HHS, PHI = individually identifiable health information +
created/received/maintained/transmitted by a covered entity. The
18 HIPAA identifiers per §164.514(b)(2) (Safe Harbor):

```
1. Name
2. Geographic subdivisions smaller than state (ZIP codes need restrictions)
3. All elements of dates (except year) for dates directly related to an individual
4. Telephone numbers
5. Vehicle identifiers + license plates
6. Fax numbers
7. Device identifiers + serial numbers
8. Email addresses
9. Web URLs
10. SSN
11. IP addresses
12. Medical record numbers
13. Biometric identifiers (fingerprints, voiceprints)
14. Health plan beneficiary numbers
15. Full-face photos + comparable images
16. Account numbers
17. Any other unique identifying number / characteristic / code
18. Certificate / license numbers
```

Test fixtures for HIPAA-scope systems MUST avoid these 18
identifiers (or use `synthetic-pii-generator` in the qa-test-data
plugin to generate safe substitutes).

## How to use

1. Confirm your role - Business Associate or Covered Entity - and pull the signed BAA's allowed purposes; they bound every access test.
2. Scrub fixtures of all 18 Safe Harbor identifiers (above); generate substitutes with `synthetic-pii-generator`.
3. Pick the Security Rule sections the feature touches (access control, audit, integrity, transmission, minimum-necessary, disposal, BAA scope).
4. Copy the matching pattern from [references/security-rule-test-patterns.md](references/security-rule-test-patterns.md) and point it at your framework's client + models.
5. For every PHI read or write, assert an audit record with a tamper-evident hash per §164.312(b); pair with `audit-trail-test-author`.
6. Assert minimum-necessary per role (§164.502(b)) - a positive access check AND negative checks for out-of-role PHI types.
7. Run in CI; the pass/fail history is itself risk-assessment evidence.

## Test patterns by Security Rule section

Full per-section patterns live in [references/security-rule-test-patterns.md](references/security-rule-test-patterns.md), covering administrative safeguards (§164.308 workforce access management, workforce training), physical safeguards (§164.310 device + media disposal), technical safeguards (§164.312 access control, audit controls, integrity, transmission security), the §164.502(b) minimum-necessary standard, and §164.504(e) BAA-scope boundaries. Each entry is a copy-ready `pytest`-style test keyed to its CFR section.

## Worked example

A billing clerk's role is added to the scheduling service. The team runs the §164.502(b) minimum-necessary pattern against `/patient/123/billing-summary` with the billing-clerk token. The response asserts `amount_due` and `insurance_provider` are present and that `clinical_notes`, `medications`, and `genetic_test_results` are absent. The negative assertion fails: the summary serializer eager-loads the full patient record, leaking `medications`. The team narrows the serializer to billing fields, re-runs, and the test passes, proving the role sees only the minimum-necessary PHI, with the read logged via the §164.312(b) audit pattern.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Real PHI in test fixtures | HIPAA violation in tests | `synthetic-pii-generator` + de-identified data |
| Audit log without tamper-evidence | Logs can be modified post-incident | Hash-chain or signed-batch log integrity (§164.312(b)) |
| Role-based access without minimum-necessary check | Over-broad access; minimum-necessary violation | Per-PHI-type test (Step §164.502(b)) |
| Skip BAA scope tests | Vendor accesses PHI outside agreement | Step §164.504(e) scope test |
| Allow plaintext HTTP for PHI even in dev | Production drift; eventual leak | Always enforce HTTPS (Step §164.312(e)) |

## Limitations

- This skill targets HIPAA Security Rule. HIPAA Privacy Rule (45
  CFR §164 Subpart E) has additional requirements (use/disclosure
  rules, accounting of disclosures); test patterns there are
  use-case specific.
- HITECH Act (2009) added breach-notification + enforcement; tests
  intersect with §164.404 - §164.414.
- State laws (e.g., California CMIA) may add additional
  requirements beyond HIPAA.
- This skill doesn't replace a HIPAA risk analysis or compliance
  consultant.

## References

- [hipaa-hhs][hipaa-hhs] - HHS HIPAA reference
- ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164 - 
  HIPAA regulations text (45 CFR §164)
- nist.gov/publications/sp-800-66-revision-1-introductory-resource-guide-implementing-hipaa-security - NIST SP 800-66 implementation guidance
- nist.gov/publications/sp-800-88-revision-1-guidelines-media-sanitization - NIST SP 800-88 device sanitization
- `gdpr-test-patterns`,
  `ccpa-test-patterns` - sister
  privacy-pattern catalogs
- `audit-trail-test-author` - 
  §164.312(b) audit log requirements
- `synthetic-pii-generator` - cross-plugin: safe PHI fixture generation
