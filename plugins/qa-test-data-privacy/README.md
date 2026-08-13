# qa-test-data-privacy

PII detection, masking, and synthetic data generation for test environments: 5 skills (pii-categories-reference, data-masking-techniques-reference, presidio-pii-detection, faker-synthetic-data, synthea-healthcare-data) + 1 build skill (pii-masking-pipeline-builder) and 1 agent (pii-leak-critic).

## Components

| Type | Name | Description |
| --- | --- | --- |
| skill | [pii-categories-reference](skills/pii-categories-reference/SKILL.md) | Catalog of PII categories across GDPR, CPRA, NIST SP 800-122, HIPAA Safe Harbor |
| skill | [data-masking-techniques-reference](skills/data-masking-techniques-reference/SKILL.md) | Masking operators + NIST 800-188 privacy models (k-anonymity, l-diversity, t-closeness, DP) |
| skill | [presidio-pii-detection](skills/presidio-pii-detection/SKILL.md) | Microsoft Presidio analyzer + anonymizer for PII scanning + masking |
| skill | [faker-synthetic-data](skills/faker-synthetic-data/SKILL.md) | Faker libraries (Python, JavaScript, Java, .NET) for synthetic substitution |
| skill | [synthea-healthcare-data](skills/synthea-healthcare-data/SKILL.md) | MITRE Synthea synthetic-patient simulator (FHIR / C-CDA / CSV output) |
| skill | [pii-masking-pipeline-builder](skills/pii-masking-pipeline-builder/SKILL.md) | Build a deployable masking pipeline spec from a source-data inventory |
| agent | [pii-leak-critic](agents/pii-leak-critic.md) | Audits masked output for leaks; classifies findings by regime; emits block/pass verdict |
| Skill | [k-anonymity-verifier](skills/k-anonymity-verifier/SKILL.md) | Verify k-anonymity / l-diversity / t-closeness on masked datasets (ARX, pycanon). |

## Differentiation

This plugin scopes **detection + masking + synthetic-substitution of
existing data**. Sibling neighbours:

- [`qa-test-data`](../qa-test-data/) - fixture *construction* (Test
  Data Builder, Factory, Object Mother, etc.). Its
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
