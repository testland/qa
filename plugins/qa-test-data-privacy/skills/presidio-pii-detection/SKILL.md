---
name: presidio-pii-detection
description: "Author and run Microsoft Presidio PII detection - wraps presidio-analyzer (PII detector) + presidio-anonymizer (replace/redact/mask/hash/encrypt operators) for scanning datasets, log streams, and free-text fields. Covers AnalyzerEngine + AnonymizerEngine setup, built-in recognizers (PERSON, EMAIL_ADDRESS, CREDIT_CARD, US_SSN, IBAN_CODE, country-specific IDs across US/UK/Spain/Italy/Poland/Singapore/Australia/India and more), custom PatternRecognizer authoring, score thresholds, and CI gating. Use when scanning *existing* data for PII (vs synthesising fresh fixtures with synthetic-pii-generator)."
---

# presidio-pii-detection

## Overview

Microsoft Presidio is an open-source SDK for PII detection and
anonymisation. Two engines compose:

- **`presidio-analyzer`** - detects PII entities in free text using
  per-entity recognisers (regex + NER + checksum validation).
- **`presidio-anonymizer`** - applies operators to the detected
  spans (replace, redact, mask, hash, encrypt, custom).

This skill wraps both. For the **categories** of PII that Presidio
detects across regulatory regimes see
[`pii-categories-reference`](../pii-categories-reference/SKILL.md);
for the **operator** chosen per field see
[`data-masking-techniques-reference`](../data-masking-techniques-reference/SKILL.md).

## When to use

- Scanning a database dump, log stream, or document corpus before
  promoting to a non-production environment.
- Building a masking pipeline
  ([`pii-masking-pipeline-builder`](../pii-masking-pipeline-builder/SKILL.md))
  that needs entity detection upstream of operator application.
- CI gating that fails the build when test fixtures contain
  unexpected PII patterns (e.g., real emails leaked into a JSON
  fixture).

For **generating** fake PII fixtures, use
[`synthetic-pii-generator`](../../../qa-test-data/skills/synthetic-pii-generator/SKILL.md).
Presidio detects; this is the orthogonal axis.

## Authoring

### Install

Per [microsoft.github.io/presidio/analyzer](https://microsoft.github.io/presidio/analyzer/):

```bash
pip install presidio-analyzer presidio-anonymizer
python -m spacy download en_core_web_lg
```

The spaCy model powers the PERSON / LOCATION NER recognisers. For
non-English text use `en_core_web_md` (smaller) or
language-specific spaCy models.

### Basic detection

```python
from presidio_analyzer import AnalyzerEngine

analyzer = AnalyzerEngine()
results = analyzer.analyze(
    text="Contact John Doe at john@example.com or +1 555-123-4567",
    language="en",
)
for r in results:
    print(r.entity_type, r.start, r.end, r.score)
# PERSON 8 16 0.85
# EMAIL_ADDRESS 20 36 1.0
# PHONE_NUMBER 40 54 0.75
```

`AnalyzerEngine()` loads the default NLP model and all built-in
recognisers. Per
[microsoft.github.io/presidio/analyzer](https://microsoft.github.io/presidio/analyzer/),
`analyze()` returns a list of `RecognizerResult` with fields
`start`, `end`, `score` (0 - 1 confidence), and `entity_type`.

### Restricting entity types

```python
results = analyzer.analyze(
    text=text,
    language="en",
    entities=["US_SSN", "CREDIT_CARD", "EMAIL_ADDRESS"],
    score_threshold=0.5,
)
```

`entities` whitelists which recognisers run. `score_threshold` (0 - 1)
drops low-confidence hits. Default threshold is 0; raise to 0.4 - 0.6
for noisy text (logs) where partial matches inflate false positives.

### Built-in entity catalog

Per [microsoft.github.io/presidio/supported_entities](https://microsoft.github.io/presidio/supported_entities/),
the global entities are:

| Entity | Detects |
|---|---|
| `CREDIT_CARD` | 12 - 19 digit numbers (Luhn-validated) |
| `CRYPTO` | Bitcoin wallet addresses |
| `DATE_TIME` | Absolute or relative dates / times |
| `EMAIL_ADDRESS` | Email box identifiers |
| `IBAN_CODE` | International bank account numbers |
| `IP_ADDRESS` | IPv4 / IPv6 |
| `MAC_ADDRESS` | Network interface identifiers |
| `NRP` | Nationality / religious / political affiliation |
| `LOCATION` | Politically or geographically defined location (NER) |
| `PERSON` | Full names (NER) |
| `PHONE_NUMBER` | Telephone numbers |
| `MEDICAL_LICENSE` | Common medical licence numbers |
| `URL` | Uniform Resource Locators |

Country-specific entities (subset):

| Region | Entities |
|---|---|
| US | `US_BANK_NUMBER`, `US_DRIVER_LICENSE`, `US_ITIN`, `US_MBI`, `US_NPI`, `US_PASSPORT`, `US_SSN` |
| UK | `UK_NHS`, `UK_NINO`, `UK_PASSPORT`, `UK_POSTCODE`, `UK_VEHICLE_REGISTRATION` |
| Spain | `ES_NIF`, `ES_NIE` |
| Italy | `IT_FISCAL_CODE`, `IT_DRIVER_LICENSE`, `IT_VAT_CODE`, `IT_PASSPORT`, `IT_IDENTITY_CARD` |
| Poland | `PL_PESEL` |
| Singapore | `SG_NRIC_FIN`, `SG_UEN` |
| Australia | `AU_ABN`, `AU_ACN`, `AU_TFN`, `AU_MEDICARE` |
| India | `IN_PAN`, `IN_AADHAAR`, `IN_VEHICLE_REGISTRATION`, `IN_VOTER`, `IN_PASSPORT`, `IN_GSTIN` |
| Finland | `FI_PERSONAL_IDENTITY_CODE` |
| Korea | `KR_DRIVER_LICENSE`, `KR_FRN`, `KR_PASSPORT`, `KR_BRN`, `KR_RRN` |
| Nigeria | `NG_NIN`, `NG_VEHICLE_REGISTRATION` |
| Thailand | `TH_TNIN` |

For the full list and entity descriptions see
[microsoft.github.io/presidio/supported_entities](https://microsoft.github.io/presidio/supported_entities/).

### Custom PatternRecognizer

For entities Presidio doesn't ship - internal employee IDs, custom
account-number formats, vendor-specific IDs - extend the analyzer:

```python
from presidio_analyzer import PatternRecognizer, Pattern

employee_id_pattern = Pattern(
    name="employee_id_pattern",
    regex=r"\bEMP-\d{6}\b",
    score=0.9,
)

employee_id_recognizer = PatternRecognizer(
    supported_entity="EMPLOYEE_ID",
    patterns=[employee_id_pattern],
    context=["employee", "staff", "personnel"],  # boosts score when nearby
)

analyzer.registry.add_recognizer(employee_id_recognizer)
```

Per Presidio docs the `Pattern` (regex + score) and `PatternRecognizer`
(supported_entity + patterns + context words + optional validation
function) compose the standard custom-recogniser pattern.

For non-regex detection (ML-based custom NER) extend
`EntityRecognizer` directly.

## Running

### Anonymise after detect

```python
from presidio_anonymizer import AnonymizerEngine
from presidio_anonymizer.entities import OperatorConfig

anonymizer = AnonymizerEngine()
anonymized = anonymizer.anonymize(
    text=text,
    analyzer_results=results,
    operators={
        "PERSON": OperatorConfig("replace", {"new_value": "<PERSON>"}),
        "EMAIL_ADDRESS": OperatorConfig("mask",
            {"chars_to_mask": 8, "masking_char": "*", "from_end": False}),
        "CREDIT_CARD": OperatorConfig("hash",
            {"hash_type": "sha256", "salt": "secret-per-tenant"}),
        "US_SSN": OperatorConfig("redact"),
    },
)
print(anonymized.text)
```

Per [microsoft.github.io/presidio/anonymizer](https://microsoft.github.io/presidio/anonymizer/),
`OperatorConfig(operator_name, params={})` is the constructor; the
default operator is `replace` with `<entity_type>` placeholder when
no operator is configured.

See
[`data-masking-techniques-reference`](../data-masking-techniques-reference/SKILL.md)
for which operator suits which field.

### Batch processing

For datasets too large to hold in memory, iterate row-by-row:

```python
import csv

with open("input.csv") as src, open("masked.csv", "w") as dst:
    reader = csv.DictReader(src)
    writer = csv.DictWriter(dst, fieldnames=reader.fieldnames)
    writer.writeheader()
    for row in reader:
        for col, val in row.items():
            if val:
                hits = analyzer.analyze(text=val, language="en")
                if hits:
                    row[col] = anonymizer.anonymize(
                        text=val, analyzer_results=hits, operators=ops
                    ).text
        writer.writerow(row)
```

For Spark / pandas batches see Presidio's structured-data tutorial.

## Parsing results

`RecognizerResult.to_dict()` serialises to JSON; collect across a
scan to feed downstream tools (CI report, quarantine queue):

```python
import json

findings = [r.to_dict() for r in results]
print(json.dumps(findings, indent=2))
# [{"entity_type": "PERSON", "start": 8, "end": 16, "score": 0.85, ...}]
```

To classify findings by regulatory regime, map `entity_type` →
regime via
[`pii-categories-reference`](../pii-categories-reference/SKILL.md)
(e.g., `US_SSN` → GDPR Art. 4(1) identifier + CPRA SPI + NIST
direct identifier + HIPAA Safe Harbor #7).

## CI integration

Block PRs that introduce real PII into test fixtures:

```yaml
# .github/workflows/pii-fixture-scan.yml
name: pii-fixture-scan
on: pull_request

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-python@v6
        with: { python-version: '3.12' }
      - run: |
          pip install presidio-analyzer
          python -m spacy download en_core_web_lg
      - run: python scripts/pii-fixture-scan.py tests/fixtures/
```

`pii-fixture-scan.py`:

```python
import sys
from pathlib import Path
from presidio_analyzer import AnalyzerEngine

analyzer = AnalyzerEngine()
BLOCKING = {"US_SSN", "CREDIT_CARD", "IBAN_CODE", "EMAIL_ADDRESS"}

violations = []
for path in Path(sys.argv[1]).rglob("*.json"):
    text = path.read_text()
    for r in analyzer.analyze(text=text, language="en", score_threshold=0.5):
        if r.entity_type in BLOCKING:
            violations.append((path, r.entity_type, r.start, r.score))

if violations:
    for v in violations:
        print(f"BLOCK {v[0]}:{v[2]}  {v[1]}  (score {v[3]:.2f})")
    sys.exit(1)
print("No blocking PII found.")
```

Tune `score_threshold` per project - 0.5 balances false positives
(synthetic-looking fixtures) against false negatives (real emails
in random strings).

## Example - scanning a log line

```python
text = (
    "2026-05-20T10:32:18Z user=alice@acme.com "
    "req_id=r-9182 ip=192.0.2.55 ssn=123-45-6789 "
    "card=4111-1111-1111-1111"
)

results = analyzer.analyze(text=text, language="en")
print([(r.entity_type, text[r.start:r.end]) for r in results])
# [('EMAIL_ADDRESS', 'alice@acme.com'),
#  ('IP_ADDRESS', '192.0.2.55'),
#  ('US_SSN', '123-45-6789'),
#  ('CREDIT_CARD', '4111-1111-1111-1111')]
```

Note: the SSN `123-45-6789` is the
[example-only SSN per SSA guidance](https://www.ssa.gov/employer/randomization.html);
`4111-1111-1111-1111` is a Visa test card from
[Stripe test-cards docs](https://stripe.com/docs/testing). Presidio
does not distinguish "real-looking but reserved-for-testing"
values - it flags the format regardless. Pair the detector with a
known-safe-value allowlist if your test fixtures intentionally use
these reserved values.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Skipping spaCy model download | `PERSON` and `LOCATION` recognisers return zero hits silently | Always run `python -m spacy download en_core_web_lg` before first use |
| Default `score_threshold = 0` on log files | Flood of low-confidence PHONE_NUMBER hits on numeric IDs | Raise threshold to 0.4 - 0.6 for log scanning |
| Single regex for SSN | Misses unformatted `123456789` and `123 45 6789` variants | Use the built-in `US_SSN` recogniser; it covers Luhn-like variants |
| No custom recogniser for in-house IDs | Internal employee IDs slip through | Define `PatternRecognizer` per Authoring section |
| `replace` operator with default placeholder for analytics | Loses distribution / cardinality | Use deterministic hash or substitution for analytics-bound output |
| Running analyzer + anonymizer on every request in prod | High latency (NER model is heavy) | Run as batch / offline; or use a lighter recogniser set |
| Trusting Presidio to be regime-complete | Built-in recognisers cover GDPR/CCPA broadly but miss specialised IDs (e.g., medical record numbers); HIPAA #8 not detected by default | Add custom `PatternRecognizer` per regime - see [`pii-categories-reference`](../pii-categories-reference/SKILL.md) |

## Limitations

- **NER models drift.** `en_core_web_lg` from spaCy is updated
  periodically; recogniser hits may shift between versions.
- **Score is a heuristic.** A score of 0.85 on PERSON doesn't mean
  85 % chance of correctness - it's a calibration relative to
  Presidio's training data.
- **No formal de-identification guarantee.** Presidio is a
  detect-and-mask toolkit, not a k-anonymity / differential
  privacy engine. For statistical privacy models see
  [`data-masking-techniques-reference`](../data-masking-techniques-reference/SKILL.md)
  on NIST SP 800-188 models.
- **English-default NLP.** Non-English text needs a different
  spaCy model and may have weaker built-in PERSON detection.
- **Free-text only.** Structured-column detection (PII in a column
  with no surrounding text) needs schema-aware logic on top - see
  [`pii-masking-pipeline-builder`](../pii-masking-pipeline-builder/SKILL.md).

## References

- Presidio Analyzer docs - 
  [microsoft.github.io/presidio/analyzer](https://microsoft.github.io/presidio/analyzer/).
- Presidio Anonymizer docs - 
  [microsoft.github.io/presidio/anonymizer](https://microsoft.github.io/presidio/anonymizer/).
- Supported entities - 
  [microsoft.github.io/presidio/supported_entities](https://microsoft.github.io/presidio/supported_entities/).
- Sibling references:
  [`pii-categories-reference`](../pii-categories-reference/SKILL.md),
  [`data-masking-techniques-reference`](../data-masking-techniques-reference/SKILL.md).
- Downstream consumers:
  [`pii-masking-pipeline-builder`](../pii-masking-pipeline-builder/SKILL.md),
  [`pii-leak-critic`](../../agents/pii-leak-critic.md).
- Orthogonal sibling:
  [`synthetic-pii-generator`](../../../qa-test-data/skills/synthetic-pii-generator/SKILL.md) - fixture generation (distinct from detection of existing data).
