# k-anonymity CI gate

Referenced from [SKILL.md](../SKILL.md) Step 6. Block promotion of a masked
dataset unless it meets the agreed thresholds recorded in `qi-policy.yaml`.
The script loads the policy, computes k / l / t with pycanon, and exits
non-zero on any breach so a failing dataset cannot be promoted.

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

The pycanon functions `anonymity.k_anonymity`, `anonymity.l_diversity`, and
`anonymity.t_closeness` used here are documented at
[github.com/IFCA-Advanced-Computing/pycanon](https://github.com/IFCA-Advanced-Computing/pycanon).
