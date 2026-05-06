# qa-compliance

Compliance test patterns + readiness review for regulated industries.
Five per-framework reference + workflow skills (GDPR, CCPA/CPRA,
SOC 2 Type II, HIPAA, PCI DSS v4.0) plus an audit-trail-test-author
build-an-X for the universal logging requirement plus an adversarial
agent that scores test coverage against any framework's criteria.

Covers the regulated-industry gap (healthcare, finance, EU
operations, federal contractors).

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| Skill | [gdpr-test-patterns](skills/gdpr-test-patterns/SKILL.md) | S2 | Test patterns by GDPR Article (Art. 7 consent / Art. 15 access / Art. 17 erasure / Art. 20 portability / Art. 33 breach / Art. 44–50 transfers / Art. 5 minimization) |
| Skill | [ccpa-test-patterns](skills/ccpa-test-patterns/SKILL.md) | S2 | CCPA + CPRA patterns: GPC opt-out, right-to-know, deletion, sensitive PI limit, right to correct, notice; SPI category catalog |
| Skill | [soc2-evidence-collector](skills/soc2-evidence-collector/SKILL.md) | S3 | Build-an-X for SOC 2 Type II evidence collection per Trust Services Criterion (CC1–CC9 + A1/C1/PI1/P1–P9); Vanta/Drata/Secureframe alignment |
| Skill | [hipaa-test-patterns](skills/hipaa-test-patterns/SKILL.md) | S2 | HIPAA Security Rule patterns: §164.308 admin, §164.310 physical, §164.312 technical, §164.502 minimum-necessary; 18-identifier PHI catalog |
| Skill | [pci-dss-scope-checker](skills/pci-dss-scope-checker/SKILL.md) | S3 | Build-an-X for PCI DSS v4.0 scope verification: CDE boundary, segmentation, no-SAD-storage, encryption at rest + in transit, access control, scope-reduction strategies |
| Skill | [audit-trail-test-author](skills/audit-trail-test-author/SKILL.md) | S3 | Build-an-X for compliance-grade audit logs: required-events catalog, structured format, hash-chain or signed-batch tamper-evidence, immutability + retention, PII redaction, cross-system aggregation |
| Agent | [compliance-readiness-reviewer](agents/compliance-readiness-reviewer.md) | A3 | Adversarial readiness reviewer per framework; per-criterion coverage matrix (covered/partial/missing/N/A); refuses "ready" if missing required criterion; refuses N/A without justification + approver + re-review-date |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-compliance@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework.
See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at
the repository root for the rubric.
