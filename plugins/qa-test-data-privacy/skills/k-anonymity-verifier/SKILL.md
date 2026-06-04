---
name: k-anonymity-verifier
description: "Verifies that a masked dataset satisfies k-anonymity, l-diversity, and t-closeness by computing equivalence classes over chosen quasi-identifiers and reporting re-identification risk. Covers quasi-identifier selection heuristics, threshold guidance, pycanon API (k_anonymity / l_diversity / t_closeness / report), ARX Java API and GUI workflow, SmartNoise for differential-privacy comparison, and CI-gate integration. Distinct from data-masking-techniques-reference (which catalogs masking operators but defers k-anonymity measurement to dedicated tooling) and from presidio-pii-detection (which detects PII spans but offers no equivalence-class analysis). Use when you need to confirm whether a masked dataset meets a stated k, l, or t threshold before promoting it to a non-production environment."
rating: 25
d6: 5
keywords:
  - k-anonymity
  - l-diversity
  - t-closeness
  - re-identification risk
  - quasi-identifier
  - equivalence class
  - pycanon
  - ARX
  - anonymization verification
---

# k-anonymity-verifier

## Overview

A masked dataset is **k-anonymous** when every record is
indistinguishable from at least k - 1 other records on the set of
quasi-identifiers (QI) - columns that, when combined, could re-identify
an individual (Sweeney 2002, cited in NIST SP 800-188:2023 at
[csrc.nist.gov/pubs/sp/800/188/final](https://csrc.nist.gov/pubs/sp/800/188/final)).

Two stronger models layer on top:

- **l-diversity** (Machanavajjhala et al. 2007, NIST 800-188 §3): each
  equivalence class must contain at least l well-represented distinct
  values of every sensitive attribute (SA), guarding against the
  homogeneity attack.
- **t-closeness** (Li et al. 2007, NIST 800-188 §3): the distribution
  of the SA within each equivalence class must be within distance t of
  the global distribution, measured by Earth Mover's Distance (EMD),
  guarding against the skewness and similarity attacks.

This skill verifies all three after masking. For choosing which
masking operator to apply per field, see
[`data-masking-techniques-reference`](../data-masking-techniques-reference/SKILL.md).
For detecting PII spans before masking, see
[`presidio-pii-detection`](../presidio-pii-detection/SKILL.md).

## Step 1 - Select quasi-identifiers

QIs are columns that are not direct identifiers but whose combination
can re-identify. Common QI categories (NIST 800-188 §2 "indirect
identifiers"):

| Category | Examples |
|---|---|
| Demographic | age, sex, race, marital status |
| Geographic | ZIP code, city, state (below county level) |
| Temporal | date of birth, admission date, discharge date |
| Clinical / occupational | diagnosis code, specialty, employer industry |

**Selection heuristics:**

- Any column that appears in a publicly available external dataset
  (voter rolls, social media profiles) is a QI candidate.
- ZIP + birth date + sex together re-identified 87 % of the US
  population in Sweeney (2000), cited in NIST 800-188 §4. That
  triple is always a QI set.
- Columns with high cardinality relative to dataset size are stronger
  QIs (more granular = more identifying).
- Drop columns that are already nulled out or fully generalised - they
  contribute no identifying power and inflate computation.

Agree the QI list with a privacy officer before running verification.
Record the agreed list in a `qi-policy.yaml` alongside the dataset.

## Step 2 - Install pycanon

pycanon is a Python library and CLI published by IFCA-CSIC that
computes k-anonymity, l-diversity, t-closeness, and related metrics
directly on a pandas DataFrame
([github.com/IFCA-Advanced-Computing/pycanon](https://github.com/IFCA-Advanced-Computing/pycanon)).

```bash
pip install pycanon
# For PDF report generation:
pip install "pycanon[PDF]"
```

Requires Python 3.10, 3.11, or 3.12
([github.com/IFCA-Advanced-Computing/pycanon](https://github.com/IFCA-Advanced-Computing/pycanon)).

## Step 3 - Compute k, l, t values

```python
import pandas as pd
from pycanon import anonymity, report

data = pd.read_csv("masked_dataset.csv")

# Agree these with your qi-policy.yaml
QI = ["age", "zip_code", "sex"]
SA = ["diagnosis"]

# k-anonymity: returns int - the minimum equivalence-class size
k = anonymity.k_anonymity(data, QI)
print(f"k = {k}")

# l-diversity: returns int - minimum distinct SA values per class
l = anonymity.l_diversity(data, QI, SA)
print(f"l = {l}")

# t-closeness: returns float - maximum EMD across all classes
t = anonymity.t_closeness(data, QI, SA)
print(f"t = {t:.4f}")
```

Per [github.com/IFCA-Advanced-Computing/pycanon](https://github.com/IFCA-Advanced-Computing/pycanon):

- `k_anonymity(data, QI)` - `data` is a pandas DataFrame; `QI` is a
  list of column name strings. Returns an `int`.
- `l_diversity(data, QI, SA)` - `SA` is a list of sensitive-attribute
  column names. Returns an `int`.
- `t_closeness(data, QI, SA)` - Returns a `float` (the worst-case EMD
  across all equivalence classes). For numerical attributes, the
  one-dimensional Earth Mover's Distance definition is used
  ([github.com/IFCA-Advanced-Computing/pycanon](https://github.com/IFCA-Advanced-Computing/pycanon)).

## Step 4 - Interpret against thresholds

NIST SP 800-188:2023 §5 recommends calibrating k to dataset size and
re-identification risk tolerance (no single universal threshold is
mandated). Practitioners use these bands as a starting point:

| Threshold | Guidance |
|---|---|
| k < 5 | Insufficient for any regulated dataset; re-identification probability > 20 % per equivalence class |
| k = 5 | Minimum acceptable for internal analytics datasets (low sensitivity) |
| k >= 10 | Recommended for moderate-risk datasets (health, financial) |
| k >= 50 | High-risk or public-release datasets |
| l < 2 | No diversity protection; homogeneity attack succeeds trivially |
| l >= 3 | Minimum useful l-diversity for SA with low cardinality |
| t > 0.5 | Weak t-closeness; large distributional drift allowed |
| t <= 0.2 | Strong t-closeness; per ARX API docs `new EqualDistanceTCloseness("disease", 0.2d)` is cited as a concrete example ([arx.deidentifier.org/development/api](https://arx.deidentifier.org/development/api/)) |

Document the agreed threshold in `qi-policy.yaml`:

```yaml
qi_policy:
  quasi_identifiers: [age, zip_code, sex]
  sensitive_attributes: [diagnosis]
  thresholds:
    k_min: 10
    l_min: 3
    t_max: 0.2
```

## Step 5 - Full report (pycanon)

pycanon's `report` module outputs utility metrics alongside the privacy
metrics
([github.com/IFCA-Advanced-Computing/pycanon](https://github.com/IFCA-Advanced-Computing/pycanon)):

```python
# Console report: k, l, t values + equivalence class stats
report.print_report(data, QI, SA)

# Machine-readable output
import json
json_report = report.get_json_report(data, QI, SA)
print(json.dumps(json_report, indent=2))

# PDF (requires pycanon[PDF])
report.get_pdf_report(data, QI, SA, filename="privacy_report.pdf")
```

The JSON report includes average equivalence class size, discernability
metric, and classification metric - use these to quantify utility loss
alongside the privacy guarantee
([github.com/IFCA-Advanced-Computing/pycanon](https://github.com/IFCA-Advanced-Computing/pycanon)).

## Step 6 - CI gate

Block promotion of a masked dataset unless it meets the agreed
thresholds:

```python
# scripts/k_anonymity_gate.py
import sys, json
import pandas as pd
from pycanon import anonymity, report

data = pd.read_csv(sys.argv[1])
policy = json.load(open("qi-policy.yaml".replace(".yaml", ".json")))

QI = policy["quasi_identifiers"]
SA = policy["sensitive_attributes"]
k_min = policy["thresholds"]["k_min"]
l_min = policy["thresholds"]["l_min"]
t_max = policy["thresholds"]["t_max"]

k = anonymity.k_anonymity(data, QI)
l = anonymity.l_diversity(data, QI, SA)
t = anonymity.t_closeness(data, QI, SA)

failures = []
if k < k_min:
    failures.append(f"k={k} < required {k_min}")
if l < l_min:
    failures.append(f"l={l} < required {l_min}")
if t > t_max:
    failures.append(f"t={t:.4f} > allowed {t_max}")

if failures:
    print("PRIVACY GATE FAILED:")
    for f in failures:
        print(f"  {f}")
    sys.exit(1)

print(f"PASS  k={k}  l={l}  t={t:.4f}")
```

```yaml
# .github/workflows/privacy-gate.yml
name: privacy-gate
on: pull_request

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-python@v6
        with: { python-version: '3.12' }
      - run: pip install pycanon
      - run: python scripts/k_anonymity_gate.py masked_dataset.csv
```

## Step 7 - ARX for anonymization + verification (Java / GUI)

When the masking step itself must be performed or when a GUI workflow
is required, use ARX
([arx.deidentifier.org/development/api](https://arx.deidentifier.org/development/api/)):

```java
// Load data
Data data = Data.create("masked.csv", Charset.defaultCharset(), ';');

// Classify attributes
data.getDefinition().setAttributeType(
    "diagnosis", AttributeType.SENSITIVE_ATTRIBUTE);
data.getDefinition().setAttributeType(
    "age", AttributeType.QUASI_IDENTIFYING_ATTRIBUTE);

// Configure privacy models
ARXConfiguration config = ARXConfiguration.create();
config.addPrivacyModel(new KAnonymity(10));
config.addPrivacyModel(new EntropyLDiversity("diagnosis", 3));
config.addPrivacyModel(new EqualDistanceTCloseness("diagnosis", 0.2d));
config.setSuppressionLimit(0.02d);   // suppress at most 2 % of rows

// Anonymize and read result
ARXAnonymizer anonymizer = new ARXAnonymizer();
ARXResult result = anonymizer.anonymize(data, config);
ARXNode optimal = result.getOptimalTransformation();
```

Per [arx.deidentifier.org/development/api](https://arx.deidentifier.org/development/api/),
`KAnonymity(n)`, `EntropyLDiversity(attr, n)`,
`EqualDistanceTCloseness(attr, t)`, and
`HierarchicalDistanceTCloseness(attr, t, hierarchy)` are the key
privacy-model classes. `setSuppressionLimit(0.02d)` caps the fraction
of records ARX may suppress to achieve the target models.

**ARX GUI workflow**
([arx.deidentifier.org/anonymization-tool](https://arx.deidentifier.org/anonymization-tool/)):

1. Load CSV via Configuration perspective.
2. Classify each column as Identifying, Quasi-Identifying, Sensitive,
   or Insensitive.
3. Define a generalisation hierarchy per QI column (age ranges, ZIP
   truncation).
4. Add privacy models (k-anonymity + l-diversity + t-closeness).
5. Run analysis - ARX explores the solution space and marks
   satisfying transformations.
6. Switch to Risk Analysis perspective to read re-identification risk
   scores (prosecutor, journalist, marketer attack models).
7. Switch to Utility Analysis perspective to compare pre/post utility
   metrics side by side.

## Step 8 - Reporting re-identification risk

Risk is reported at two granularities:

- **Equivalence-class level:** any class of size exactly k has a 1/k
  probability of re-identification for the prosecutor attack model
  (NIST 800-188 §4).
- **Dataset level:** pycanon's JSON report `"discernability_metric"`
  and `"average_class_size"` summarise across all classes. ARX
  `RiskEstimator` provides sample-based and population-uniqueness
  estimates
  ([arx.deidentifier.org/development/api](https://arx.deidentifier.org/development/api/)).

Map findings to risk tiers:

| Scenario | Metric | Risk tier |
|---|---|---|
| Smallest class size = 1 (unique record) | k = 1 | Critical - record uniquely identifiable |
| k < 5 | k = 2..4 | High - must re-mask or suppress |
| k >= threshold, but some class has homogeneous SA | l = 1 | High - homogeneity attack trivially succeeds |
| k and l met, but t > 0.5 | t > 0.5 | Medium - distributional skewness exploitable |
| All thresholds met | k >= k_min, l >= l_min, t <= t_max | Pass |

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Running k-anonymity on the wrong QI set | Missing a QI (e.g., ZIP omitted) inflates k; record is still re-identifiable | Agree QIs against a data-linkage threat model before measuring |
| Trusting k alone on a low-cardinality SA | Homogeneity attack succeeds when all k records share the same diagnosis | Always add l-diversity check when SA cardinality is low |
| t = 1.0 (accepting any distribution) | t-closeness is vacuous at t = 1.0; any distribution satisfies it | Set t <= 0.2 for regulated datasets; document in policy |
| Generalising then measuring on the original dataset | k is measured on the generalised/suppressed output, not on the raw input | Run pycanon on the masked CSV, never the source CSV |
| k = 2 for internal analytics | Re-identification probability 50 % per class | k >= 5 minimum (NIST 800-188 §5 guidance) |
| Ignoring suppression rate | ARX may suppress 20 % of rows to achieve k = 50 | Set `suppressionLimit` to a business-acceptable cap (e.g., 2 %) and verify utility at that limit |

## Limitations

- **QI selection is not automated.** No tool eliminates the need for
  a human threat-model review. A column missed from the QI list
  silently inflates k without providing real protection.
- **k-anonymity does not protect continuous attributes.** Age stored
  as an exact integer in the QI yields many size-1 classes in small
  datasets; generalise to ranges before measuring.
- **pycanon measures; it does not suppress or generalise.** Use ARX
  or a masking pipeline when the dataset fails the gate and must be
  re-masked.
  ([`pii-masking-pipeline-builder`](../pii-masking-pipeline-builder/SKILL.md))
- **t-closeness is computationally expensive** on large datasets with
  many QI combinations. Benchmark with pycanon before gating in CI;
  consider sampling on datasets > 1 M rows.
- **SmartNoise** ([github.com/opendp/smartnoise-sdk](https://github.com/opendp/smartnoise-sdk))
  implements differential privacy noise injection on query outputs -
  a different guarantee that adds noise to aggregate results rather
  than transforming the raw dataset. It does not replace k-anonymity
  verification on stored masked datasets; the two approaches address
  different threat models.

## References

- pycanon source and README:
  [github.com/IFCA-Advanced-Computing/pycanon](https://github.com/IFCA-Advanced-Computing/pycanon).
  Functions `k_anonymity`, `l_diversity`, `t_closeness`, `report.print_report`,
  `report.get_json_report` cited inline above.
- ARX Java API:
  [arx.deidentifier.org/development/api](https://arx.deidentifier.org/development/api/).
  Classes `KAnonymity`, `EntropyLDiversity`, `EqualDistanceTCloseness`,
  `HierarchicalDistanceTCloseness`, `ARXConfiguration.setSuppressionLimit` cited above.
- ARX anonymization tool (GUI):
  [arx.deidentifier.org/anonymization-tool](https://arx.deidentifier.org/anonymization-tool/).
- NIST SP 800-188:2023 "De-Identifying Government Datasets" - definitions of
  k-anonymity, l-diversity, t-closeness, re-identification risk models:
  [csrc.nist.gov/pubs/sp/800/188/final](https://csrc.nist.gov/pubs/sp/800/188/final).
- SmartNoise SDK (differential privacy, not k-anonymity):
  [github.com/opendp/smartnoise-sdk](https://github.com/opendp/smartnoise-sdk).
- Sibling skills in this plugin:
  [`data-masking-techniques-reference`](../data-masking-techniques-reference/SKILL.md),
  [`presidio-pii-detection`](../presidio-pii-detection/SKILL.md),
  [`pii-masking-pipeline-builder`](../pii-masking-pipeline-builder/SKILL.md).
