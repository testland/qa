---
name: bdd-step-library-curator
description: "Build-an-X workflow that keeps step definitions DRY across a Cucumber / Behave / Reqnroll project - periodically inventories step definitions, finds duplicates (different patterns matching the same intent), suggests consolidation, organizes by domain, and publishes a step library reference doc the team uses for \"is there already a step for X?\" before authoring new ones. Use as the antidote to step-definition proliferation in long-lived BDD projects."
---

# bdd-step-library-curator

## Overview

After 6 months of a BDD project, step definitions proliferate:

- Two engineers write `Given a user` and `Given a logged-in user`
  for the same fixture.
- Three slightly-different "I click X" steps (one for buttons,
  one for links, one for arbitrary elements) - all do the same
  thing.
- A new engineer can't find existing steps and writes a fourth
  variant.

The result: step library bloat → Gherkin features hard to read,
step ambiguities, runtime errors, drift.

This skill builds a curation workflow.

## When to use

- A BDD project's step count exceeds ~50 (proliferation threshold).
- A new engineer reports "I couldn't find a step for X."
- Quarterly: scheduled step review.
- Before adopting BDD across multiple teams (proactively design
  the step library shape).

## Step 1 - Inventory step definitions

Per-language extraction:

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

Output: a list of step patterns. The audit:

```
Total step definitions: 142
Unique patterns: 138    (4 ambiguous duplicates already)
Per Gherkin verb:
  Given: 58
  When:  34
  Then:  47
  And:    3
```

## Step 2 - Detect duplicates / overlaps

Two patterns are likely duplicates when:

- Same wording, different phrasing: `Given a user` vs `Given an
  existing user` vs `Given the user`.
- Same parameters, different verbs: `When I click {label}` vs
  `When I press {label}` vs `When I tap {label}`.
- Same fixture, different shape: `Given a cart with {n} items` vs
  `Given a cart containing {n} items`.

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

steps = [...]   # from Step 1

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

## Step 3 - Recommend consolidation

For each duplicate group:

```markdown
**Duplicate group:** 4 step definitions with normalized "user is
logged in"

| Pattern                            | File / line                |
|------------------------------------|----------------------------|
| `Given a user is logged in`         | `auth_steps.py:12`         |
| `Given the user is logged in`        | `cart_steps.py:8`           |
| `Given an authenticated user`        | `checkout_steps.py:5`       |
| `Given a logged-in user`            | `profile_steps.py:14`       |

**Recommendation:** Consolidate to **`Given a logged-in user`**
(highest count of usage in current Gherkin; clearest wording).

Replace the other 3 step definitions with a single canonical one
in `shared_steps.py`. Update the Gherkin features that use the
deprecated patterns.
```

## Step 4 - Domain organization

Group steps per domain area:

```
features/steps/
├── shared/                      # cross-domain (login, navigation, etc.)
│   ├── auth_steps.py
│   ├── navigation_steps.py
│   └── data_steps.py
├── checkout/                    # checkout-specific
│   ├── promo_steps.py
│   ├── payment_steps.py
│   └── cart_steps.py
├── account/                     # account-specific
│   └── profile_steps.py
└── README.md                    # step library index
```

The README is the discoverability artifact:

```markdown
# Step library

## Shared (cross-domain)

### Auth
- `Given a logged-in user` (auth_steps.py:12) - creates and logs in a generic test user.
- `Given a logged-in admin` (auth_steps.py:25) - logged-in user with admin role.
- `Given an unauthenticated visitor` (auth_steps.py:38) - no session.

### Navigation
- `When I navigate to {path}` - go to URL.
- `When I click {label}` - click any element with this label.

## Checkout

### Cart
- `Given the cart contains {qty} of {sku} at ${price}` - seed a cart.
- `Given the cart is empty` - empty cart.

### Promo codes
- `Given promo code {code} is active` - pre-seed a promo in the admin.
- `When I enter {code} in the promo input` - type the code.
- `When I click {label}` - (uses shared step).

(...)
```

The README + grep is the team's "is there a step for X?" tool.

## Step 5 - Pre-merge step gate

Add a CI check that flags new step definitions:

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

The check warns; doesn't block. Forces the author to acknowledge
the new step.

## Step 6 - Quarterly cadence

| Cadence            | Trigger                                           |
|--------------------|---------------------------------------------------|
| Quarterly           | Scheduled step library review.                    |
| New team member     | Onboarding: walk the README.                      |
| Step count exceeds threshold | Triggered review.                         |
| New domain area     | Add steps; update README.                          |

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Per-engineer step files (`alice_steps.py`)                            | Ownership without domain alignment; duplication across files.            | Domain-organized files (Step 4). |
| Step library README missing                                            | Discoverability nil; engineers re-implement.                             | README per Step 4. |
| Ambiguous step deletion without grep                                   | Breaks scenarios silently.                                                | Replace canonical → deprecated; update all Gherkin first. |
| Step "shared library" that's a giant `helpers.py`                      | All engineers conflict on it; merge hell.                                | Domain split (Step 4). |
| Reviewing step count quarterly only                                    | Proliferation outpaces review; library bloats.                          | Pre-merge gate (Step 5). |

## Limitations

- **Heuristic duplicate detection.** Some patterns are
  legitimately distinct (`Given a user` for auth vs `Given a user
  with profile data` for profile tests).
- **Domain organization is per-team.** What's "shared" varies.
- **Consolidation cost.** Each refactor touches Gherkin + step
  definitions; not free.
- **Doesn't fix Gherkin quality.** A clean step library doesn't
  prevent imperative-style Gherkin scenarios. Pair with a Gherkin
  style review.

## References

- [`cucumber-testing`](../cucumber-testing/SKILL.md),
  [`behave-testing`](../behave-testing/SKILL.md),
  [`reqnroll-testing`](../reqnroll-testing/SKILL.md) - per-language
  runners this curator works alongside.
