# qa-test-data-privacy

PII detection, masking, and synthetic data generation for test environments: 5 skills (pii-categories-reference, data-masking-techniques-reference, presidio-pii-detection, faker-synthetic-data, synthea-healthcare-data) + 1 build skill (pii-masking-pipeline-builder) and 1 agent (pii-leak-critic).

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| skill | [pii-categories-reference](skills/pii-categories-reference/SKILL.md) | S2 | Catalog of PII categories across GDPR, CPRA, NIST SP 800-122, HIPAA Safe Harbor |
| skill | [data-masking-techniques-reference](skills/data-masking-techniques-reference/SKILL.md) | S2 | Masking operators + NIST 800-188 privacy models (k-anonymity, l-diversity, t-closeness, DP) |
| skill | [presidio-pii-detection](skills/presidio-pii-detection/SKILL.md) | S1 | Microsoft Presidio analyzer + anonymizer for PII scanning + masking |
| skill | [faker-synthetic-data](skills/faker-synthetic-data/SKILL.md) | S1 | Faker libraries (Python, JavaScript, Java, .NET) for synthetic substitution |
| skill | [synthea-healthcare-data](skills/synthea-healthcare-data/SKILL.md) | S1 | MITRE Synthea synthetic-patient simulator (FHIR / C-CDA / CSV output) |
| skill | [pii-masking-pipeline-builder](skills/pii-masking-pipeline-builder/SKILL.md) | S3 | Build a deployable masking pipeline spec from a source-data inventory |
| agent | [pii-leak-critic](agents/pii-leak-critic.md) | A3 | Audits masked output for leaks; classifies findings by regime; emits block/pass verdict |

## Differentiation

This plugin scopes **detection + masking + synthetic-substitution of
existing data**. Sibling neighbours:

- [`qa-test-data`](../qa-test-data/) — fixture *construction* (Test
  Data Builder, Factory, Object Mother, etc.). Its
  [`synthetic-pii-generator`](../qa-test-data/skills/synthetic-pii-generator/SKILL.md)
  *generates* fresh fake PII; this plugin *detects + masks*
  existing PII.
- [`qa-compliance`](../qa-compliance/) — regulatory feature testing
  (does GDPR Art. 17 erasure work? does CCPA delete-on-request
  work?). This plugin engineers the data those tests run against.
- [`qa-secrets`](../qa-secrets/) — credentials / API keys
  (different scope from personal data).

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-test-data-privacy@testland-qa
```

## Rating

All components in this plugin pass the v4.0 quality gate
(8 dimensions, 0-40 scale, importable bar 28/40). CI enforces total
>=21/30 with d6 >=1 (v2.0 floor); D7 (eval coverage) and D8 (best-practices
adherence) are advisory through the shadow window. See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) for the
rubric.See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at
the repository root for the rubric.
