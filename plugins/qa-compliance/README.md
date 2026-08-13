# qa-compliance

Compliance test patterns + readiness scoring for regulated industries.
Six skills: per-framework reference + workflow catalogs (GDPR with the
CCPA/CPRA analogue in references, SOC 2 Type II collection + cross-framework
evidence packaging, HIPAA, PCI DSS v4.0), an audit-trail-test-author
build-an-X for the universal logging requirement, and a coverage-scoring
skill that scores evidence against any framework's criteria - ISO/IEC
27001:2022 Annex A patterns included - with an adversarial
readiness-review mode.

Covers the regulated-industry gap (healthcare, finance, EU
operations, federal contractors).

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [gdpr-test-patterns](skills/gdpr-test-patterns/SKILL.md) | Test patterns by GDPR Article (Art. 7 consent / Art. 15 access / Art. 17 erasure / Art. 20 portability / Art. 33 breach / Art. 44 - 50 transfers / Art. 5 minimization); CCPA/CPRA patterns (GPC opt-out, right-to-know, deletion, sensitive-PI limit, right to correct) in references/ccpa.md |
| Skill | [soc2-evidence-collector](skills/soc2-evidence-collector/SKILL.md) | Build-an-X for SOC 2 Type II evidence collection per Trust Services Criterion (CC1 - CC9 + A1/C1/PI1/P1 - P9); Vanta/Drata/Secureframe alignment; cross-framework auditor-facing evidence packaging (control-evidence matrix, chain of custody) in references/evidence-packaging.md |
| Skill | [hipaa-test-patterns](skills/hipaa-test-patterns/SKILL.md) | HIPAA Security Rule patterns: §164.308 admin, §164.310 physical, §164.312 technical, §164.502 minimum-necessary; 18-identifier PHI catalog |
| Skill | [pci-dss-control-test-author](skills/pci-dss-control-test-author/SKILL.md) | Build-an-X for PCI DSS v4.0 scope verification: CDE boundary, segmentation, no-SAD-storage, encryption at rest + in transit, access control, scope-reduction strategies |
| Skill | [audit-trail-test-author](skills/audit-trail-test-author/SKILL.md) | Build-an-X for compliance-grade audit logs: required-events catalog, structured format, hash-chain or signed-batch tamper-evidence, immutability + retention, PII redaction, cross-system aggregation |
| Skill | [compliance-coverage-scoring](skills/compliance-coverage-scoring/SKILL.md) | Scores evidence against a named framework version criterion by criterion, records every scope exclusion with approver and re-review date, and runs an adversarial readiness review that refuses "ready" with unjustified gaps; ISO/IEC 27001:2022 Annex A test patterns in references/iso27001.md |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-compliance@testland-qa
```
