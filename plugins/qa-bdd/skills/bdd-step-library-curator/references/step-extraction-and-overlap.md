# Step extraction, overlap detection, and the pre-merge gate

Deep reference for the bdd-step-library-curator SKILL. Consult when running the
inventory against a specific BDD runner, wiring the programmatic overlap
detector, or adding the pre-merge new-step CI gate.

## Per-runner step extraction

Each BDD runner declares steps with its own annotation syntax; extract the raw
patterns per runner and combine the output into a single list.

```bash
# Cucumber-JVM
grep -rE '@(Given|When|Then|And|But)\(' src/test/java/ | \
  sed -E 's/.*@(Given|When|Then|And|But)\("([^"]*)".*/\2/'

# Behave
grep -rE '^@(given|when|then|step)\(' features/steps/ | \
  sed -E 's/.*@(given|when|then|step)\("([^"]*)".*/\2/'

# Reqnroll / SpecFlow
grep -rE '\[(Given|When|Then|And|But)\(' Tests/Steps/ | \
  sed -E 's/.*\[(Given|When|Then|And|But)\("([^"]*)".*/\2/'
```

Each command emits one step pattern per line; feed the combined list into the
overlap detector below.

## Programmatic overlap detection

Normalize each pattern (lowercase, strip articles, collapse every parameter to a
single placeholder) and group patterns that collapse to the same normalized
form. Any group of size greater than one is a candidate duplicate cluster.

```python
# scripts/step-overlap.py
import re

def normalize(pattern):
    """Lower; strip articles; remove parameter type hints."""
    p = pattern.lower()
    p = re.sub(r'\b(a|an|the)\b', '', p)
    p = re.sub(r'\{[^}]+\}', '{var}', p)
    p = re.sub(r'\s+', ' ', p).strip()
    return p

steps = [...]   # from the extraction step

normalized = {}
for s in steps:
    n = normalize(s['pattern'])
    normalized.setdefault(n, []).append(s)

for n, group in normalized.items():
    if len(group) > 1:
        print(f"Likely duplicates ({len(group)}):")
        for s in group:
            print(f"  {s['pattern']} - {s['file']}:{s['line']}")
```

The detector is a heuristic - review each cluster before consolidating, since
some collisions are legitimately distinct steps.

## Pre-merge new-step gate

A CI check that warns (does not block) whenever a PR adds new step definitions,
forcing the author to confirm the step is not already in the library.

```bash
# scripts/check-new-steps.sh
NEW_STEPS=$(git diff --diff-filter=A origin/main...HEAD -- '**/steps/*.py' '**/Steps/*.cs' '**/steps/*.java' \
  | grep -E '^\+' | grep -E '@(Given|When|Then)' | wc -l)

if [ $NEW_STEPS -gt 0 ]; then
  echo "::warning::This PR adds $NEW_STEPS new step definitions."
  echo "Before merging, verify these aren't duplicates of existing steps."
  echo "Run: bash scripts/step-overlap.py"
fi
```

The warning is intentionally non-blocking - it forces acknowledgment of a new
step without stopping legitimately-new ones.
