# Matrix generation, CI wiring, aggregation, cadence

## Generate the combination matrix

A small generator script enumerates the combinations from
`flag-matrix.yaml`:

```python
# scripts/gen-flag-matrix.py
import json, sys, yaml
from itertools import product

cfg = yaml.safe_load(open(sys.argv[1]))
combos = []

# Single-flag variants
for flag, spec in cfg['flags'].items():
    base = {f: defaultFor(s) for f, s in cfg['flags'].items()}
    for variant in spec.get('test', spec.get('variants', [])):
        combo = dict(base)
        combo[flag] = variant
        combos.append({'name': f'{flag}={variant}', 'flags': combo})

# Declared interactions
for tuple_flags in cfg.get('interactions', []):
    spaces = [cfg['flags'][f].get('test', cfg['flags'][f].get('variants', [])) for f in tuple_flags]
    base = {f: defaultFor(s) for f, s in cfg['flags'].items()}
    for combo_values in product(*spaces):
        combo = dict(base)
        for f, v in zip(tuple_flags, combo_values):
            combo[f] = v
        combos.append({
            'name': '+'.join(f'{f}={v}' for f, v in zip(tuple_flags, combo_values)),
            'flags': combo,
        })

print(json.dumps(combos, indent=2))

def defaultFor(spec):
    if 'test' in spec: return spec['test'][0]   # first listed variant is the baseline
    return spec['variants'][0]
```

Output: a JSON array of `{name, flags}` objects, one per CI shard.

## Wire the CI matrix

```yaml
# .github/workflows/flag-harness.yml
name: flag-harness
on:
  pull_request:
    paths:
      - 'tests/flag-matrix.yaml'
      - 'src/**'

jobs:
  generate:
    runs-on: ubuntu-latest
    outputs:
      combos: ${{ steps.gen.outputs.combos }}
    steps:
      - uses: actions/checkout@v5
      - id: gen
        run: |
          combos=$(python scripts/gen-flag-matrix.py tests/flag-matrix.yaml)
          echo "combos=$combos" >> "$GITHUB_OUTPUT"

  test:
    needs: generate
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      max-parallel: 8
      matrix:
        combo: ${{ fromJSON(needs.generate.outputs.combos) }}
    name: test (${{ matrix.combo.name }})
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm test
        env:
          FLAGS_JSON: ${{ toJSON(matrix.combo.flags) }}
```

`fail-fast: false` is load-bearing - when one combination fails,
the matrix continues so the team sees every failing combination at
once, not just the first.

## Aggregate the result matrix

After the matrix runs, build a single artifact that shows pass/fail
per combination:

```markdown
## Flag harness results - `<sha>`

| Combination                                          | Result | Failures              |
|------------------------------------------------------|:------:|-----------------------|
| baseline (all flags = baseline)                       |   ✅   |                       |
| new_checkout=on                                       |   ✅   |                       |
| new_checkout=off                                      |   ✅   |                       |
| promo_codes=on                                        |   ❌   | `checkout.spec.ts:42` |
| ranking_experiment=treatment_a                        |   ✅   |                       |
| ranking_experiment=treatment_b                        |   ❌   | `cart.spec.ts:18`     |
| new_checkout=on + promo_codes=on                      |   ❌   | `checkout.spec.ts:42`, `promo.spec.ts:7` |
| payment_kill_switch=off                               |   ✅   |                       |
```

The aggregator reads each shard's JUnit XML, groups by combo name,
emits the table. Failures column links to the failing test files for
quick triage.

## Pre-merge / nightly cadence

- **Pre-merge (PR):** Run only the combinations whose flags appear in
  changed files. The flag-matrix YAML lists owner files per flag:
  ```yaml
  flags:
    new_checkout: { ..., owners: [src/checkout/**] }
  ```
  The CI step `git diff --name-only origin/main...HEAD | grep -f owners.glob` selects.
- **Nightly:** Run the full matrix. Catches drift in flags whose
  owner files weren't touched but whose behavior was affected by
  upstream code.

This split keeps PR runtime bounded while still gaining full
coverage every 24h.
