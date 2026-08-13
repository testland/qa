# qa-test-data-privacy

PII detection, masking, and synthetic data generation for test environments: 4 skills - the pii-masking-pipeline-builder centerpiece (detect → mask → verify, with the PII-category, masking-technique, and Faker-substitution catalogs in its references/) plus presidio-pii-detection, synthea-healthcare-data, and k-anonymity-verifier.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [pii-masking-pipeline-builder](skills/pii-masking-pipeline-builder/SKILL.md) | The full detect → mask → verify pipeline: field classification (references/pii-categories.md), operator selection (references/masking-techniques.md), Faker substitution (references/faker-masking-operators.md), deployable YAML spec, adversarial leak-audit verification pass |
| Skill | [presidio-pii-detection](skills/presidio-pii-detection/SKILL.md) | Microsoft Presidio analyzer + anonymizer for PII scanning + masking |
| Skill | [synthea-healthcare-data](skills/synthea-healthcare-data/SKILL.md) | MITRE Synthea synthetic-patient simulator (FHIR / C-CDA / CSV output) |
| Skill | [k-anonymity-verifier](skills/k-anonymity-verifier/SKILL.md) | Verify k-anonymity / l-diversity / t-closeness on masked datasets (ARX, pycanon). |

## Differentiation

This plugin scopes **detection + masking + synthetic-substitution of
existing data**. Sibling neighbours:

- [`qa-test-data`](../qa-test-data/) - fixture *construction* (Test
  Data Builder, Factory, Object Mother, etc.). Its
  [`faker-data`](../qa-test-data/skills/faker-data/SKILL.md) owns
  fixture-style fake data built from nothing, and its
  [`synthetic-pii-generator`](../qa-test-data/skills/synthetic-pii-generator/SKILL.md)
  *generates* fresh fake PII; this plugin *detects + masks*
  existing PII.
- [`qa-compliance`](../qa-compliance/) - regulatory feature testing
  (does GDPR Art. 17 erasure work? does CCPA delete-on-request
  work?). This plugin engineers the data those tests run against.
- [`qa-secrets`](../qa-secrets/) - credentials / API keys
  (different scope from personal data).

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-test-data-privacy@testland-qa
```
