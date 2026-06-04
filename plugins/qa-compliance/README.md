# qa-compliance

Compliance test patterns + readiness review for regulated industries.
Five per-framework reference + workflow skills (GDPR, CCPA/CPRA,
SOC 2 Type II, HIPAA, PCI DSS v4.0) plus an audit-trail-test-author
build-an-X for the universal logging requirement plus an adversarial
agent that scores test coverage against any framework's criteria.

Covers the regulated-industry gap (healthcare, finance, EU
operations, federal contractors).

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [gdpr-test-patterns](skills/gdpr-test-patterns/SKILL.md) | Test patterns by GDPR Article (Art. 7 consent / Art. 15 access / Art. 17 erasure / Art. 20 portability / Art. 33 breach / Art. 44 - 50 transfers / Art. 5 minimization) |
| Skill | [ccpa-test-patterns](skills/ccpa-test-patterns/SKILL.md) | CCPA + CPRA patterns: GPC opt-out, right-to-know, deletion, sensitive PI limit, right to correct, notice; SPI category catalog |
| Skill | [soc2-evidence-collector](skills/soc2-evidence-collector/SKILL.md) | Build-an-X for SOC 2 Type II evidence collection per Trust Services Criterion (CC1 - CC9 + A1/C1/PI1/P1 - P9); Vanta/Drata/Secureframe alignment |
| Skill | [hipaa-test-patterns](skills/hipaa-test-patterns/SKILL.md) | HIPAA Security Rule patterns: §164.308 admin, §164.310 physical, §164.312 technical, §164.502 minimum-necessary; 18-identifier PHI catalog |
| Skill | [pci-dss-scope-checker](skills/pci-dss-scope-checker/SKILL.md) | Build-an-X for PCI DSS v4.0 scope verification: CDE boundary, segmentation, no-SAD-storage, encryption at rest + in transit, access control, scope-reduction strategies |
| Skill | [audit-trail-test-author](skills/audit-trail-test-author/SKILL.md) | Build-an-X for compliance-grade audit logs: required-events catalog, structured format, hash-chain or signed-batch tamper-evidence, immutability + retention, PII redaction, cross-system aggregation |
| Agent | [compliance-readiness-reviewer](agents/compliance-readiness-reviewer.md) | Adversarial readiness reviewer per framework; per-criterion coverage matrix (covered/partial/missing/N/A); refuses "ready" if missing required criterion; refuses N/A without justification + approver + re-review-date |
| Skill | [iso27001-test-patterns](skills/iso27001-test-patterns/SKILL.md) | Pure reference: ISO/IEC 27001:2022 Annex A control themes and testable technical controls. |
| Skill | [compliance-evidence-generator](skills/compliance-evidence-generator/SKILL.md) | Build auditor-facing evidence packages: control-to-test mapping, evidence matrix, chain of custody. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-compliance@testland-qa
```

## Rating

All components in this plugin pass the v4.0 quality gate
(8 dimensions, 0-40 scale, importable bar 28/40). CI enforces total
>=21/30 with d6 >=1 (v2.0 floor); D7 (eval coverage) and D8 (best-practices
adherence) are advisory through the shadow window. See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) for the
rubric.See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at
the repository root for the rubric.
