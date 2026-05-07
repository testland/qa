---
name: parameterized-test-generator
description: "Generates parameterized test inputs combining boundary-value, equivalence-class, and pairwise-combinatorial cases from a typed multi-input specification — produces the cross-product of cases up to a configurable strength (1-wise / 2-wise / N-wise) using all-pairs reduction so the test surface stays tractable. Emits cases in the project's test-runner-native parametrize format. Use when a function or endpoint takes 3+ inputs whose interactions matter and full Cartesian product would explode."
rating: 24
d6: 4
archetype: S3
---

# parameterized-test-generator

## Overview

When a function takes multiple inputs whose interactions matter,
the naive test set is the **Cartesian product**: 4 roles × 4 tiers
× 5 features × 6 locales = 480 tests. Most teams give up before
authoring all 480 and end up with happy-path-only coverage that
misses interaction bugs.

The fix is **all-pairs (pairwise) testing** — pick a smaller test
set that covers every **pair** of input values across the full
matrix. Empirically, 2-wise coverage finds the majority of
interaction bugs at a fraction of the test count. ISTQB defines
this technique as
[**all-pairs testing**](https://glossary.istqb.org/en_US/term/all-pairs-testing)
(also called **pairwise testing**).

This skill takes a multi-input spec and emits a reduced test set
covering 1-wise / 2-wise / N-wise combinations.

## When to use

- A function / endpoint takes 3 or more enumerable inputs (roles,
  tiers, statuses, feature flags, locales).
- Cartesian product would produce >100 tests.
- Pairs of inputs interact (e.g. `tier=enterprise` + `feature=sso`
  has a different code path than `tier=free` + `feature=sso`).
- Existing tests cover only a few hand-picked combinations — the
  team wants systematic coverage.

If only one input has multiple values, use
[`boundary-value-generator`](../boundary-value-generator/SKILL.md)
instead — boundary analysis is the right tool for single-input
testing.

## Coverage strength

| Strength | Coverage                                                           |
|----------|--------------------------------------------------------------------|
| 1-wise   | Every individual value of every input appears in at least one test. |
| 2-wise (pairwise) | Every **pair** of values across two inputs appears together. |
| 3-wise   | Every triplet of values across three inputs appears together.       |
| N-wise   | Every N-tuple appears.                                              |

| Strength | Test count for 4×4×5×6 input space (480 max) | Notes |
|----------|----------------------------------------------:|-------|
| 1-wise   | 6                                             | Just touches every value once. |
| 2-wise   | ~30                                           | Standard recommendation; finds most interaction bugs. |
| 3-wise   | ~120                                          | Use when triplet interactions matter (e.g. role × tier × feature). |
| Cartesian | 480                                          | Use only for small input spaces (≤4 inputs, ≤3 values each). |

**Default:** 2-wise. Promote to 3-wise only when an incident
postmortem shows a triplet bug slipped through 2-wise.

## Tools that compute the reduced set

| Tool        | Language   | Notes                                                        |
|-------------|------------|--------------------------------------------------------------|
| **PICT**    | Standalone | Microsoft's canonical pairwise tool; CLI; deterministic output. |
| **AllPairs** | Python    | Library; integrates with pytest.                              |
| **CATS**    | Multi-lang | Open-source Combinatorial Test Generator.                     |

For programmatic generation, the team picks one based on language
preference. PICT is the most language-agnostic — outputs CSV that
the test scaffolding can parametrize.

## Input specification

A YAML format the skill consumes:

```yaml
inputs:
  - name: role
    values: [admin, manager, standard, read_only]
  - name: tier
    values: [free, starter, pro, enterprise]
  - name: feature
    values: [sso, audit_log, api_access, custom_branding, support_priority]
  - name: locale
    values: [en-US, ja-JP, de-DE, ar-SA, fr-FR, pt-BR]

strength: 2
constraints:
  # Mutually exclusive combinations (suppress these from generation):
  - "tier=free AND feature=sso"          # SSO is paid-only
  - "tier=free AND feature=audit_log"    # Audit log is paid-only
```

`constraints` exclude combinations that don't make sense in the
domain — including them would generate tests for impossible states.

## Output formats

### Pairwise CSV (PICT-style)

```
role,tier,feature,locale
admin,free,api_access,en-US
admin,starter,sso,ja-JP
admin,pro,audit_log,de-DE
admin,enterprise,custom_branding,ar-SA
manager,free,api_access,fr-FR
manager,starter,sso,pt-BR
...
```

### pytest

```python
import pytest

CASES = [
    ("admin", "free", "api_access", "en-US"),
    ("admin", "starter", "sso", "ja-JP"),
    ("admin", "pro", "audit_log", "de-DE"),
    # ... ~30 cases for 2-wise of the 4×4×5×6 space
]

@pytest.mark.parametrize("role,tier,feature,locale", CASES)
def test_user_capability(role, tier, feature, locale):
    result = check_capability(role=role, tier=tier, feature=feature, locale=locale)
    assert result.allowed in (True, False)   # specific assertion per the business rules
```

### Jest / Vitest

```javascript
const cases = [
  ['admin', 'free', 'api_access', 'en-US'],
  ['admin', 'starter', 'sso', 'ja-JP'],
  // ...
];

test.each(cases)(
  'role=%s tier=%s feature=%s locale=%s',
  (role, tier, feature, locale) => {
    const result = checkCapability({ role, tier, feature, locale });
    expect(typeof result.allowed).toBe('boolean');
  }
);
```

### xUnit (.NET)

```csharp
public static IEnumerable<object[]> Cases =>
    new List<object[]>
    {
        new object[] { "admin",   "free",     "api_access",      "en-US" },
        new object[] { "admin",   "starter",  "sso",             "ja-JP" },
        // ...
    };

[Theory]
[MemberData(nameof(Cases))]
public void UserCapability(string role, string tier, string feature, string locale)
{
    var result = CheckCapability(role, tier, feature, locale);
    Assert.IsType<bool>(result.Allowed);
}
```

## Verifying coverage

After generation, the skill emits a coverage report:

```markdown
## Coverage report — strength 2

**Inputs:** 4 (role × 4 values, tier × 4 values, feature × 5 values, locale × 6 values)
**Cartesian total:** 480 cases
**Generated cases:** 30
**Constraints suppressed:** 8 cases (tier=free × {sso,audit_log})

### Pair coverage matrix

| Pair                    | Required | Covered | Coverage |
|-------------------------|---------:|--------:|---------:|
| role × tier              |       16 |      14 |     88%  |
| role × feature           |       20 |      20 |    100%  |
| role × locale            |       24 |      24 |    100%  |
| tier × feature           |       20 |      18 |     90%  |
| tier × locale            |       24 |      24 |    100%  |
| feature × locale         |       30 |      30 |    100%  |

### Gaps (uncovered pairs)

- (role=read_only, tier=free) — suppressed by constraint
- (tier=starter, feature=audit_log) — increase strength or hand-add
```

The team reviews gaps; either accepts them (constraint-driven
gap = OK) or escalates to 3-wise.

## Anti-patterns

| Anti-pattern                                                | Why it fails                                                       | Fix |
|-------------------------------------------------------------|---------------------------------------------------------------------|-----|
| Cartesian product test set when input count > 3              | Tests grow combinatorially; CI time explodes; flaky.              | Use 2-wise; promote to 3-wise per incident. |
| Skipping `constraints` for impossible combinations           | Tests fail for the wrong reason — testing tier=free + sso, which the system rejects. | Always declare domain constraints upfront. |
| Hard-coded test list maintained by hand                      | Combinatorial set is fragile; adding one input value 2x's the test count. | Generate from the spec; check the spec into git. |
| Failing to update the spec when business rules change        | Test set drifts from production reality.                          | Spec is the source of truth; reviewers reject PRs that update tests without updating the spec. |
| Using 1-wise as the default                                   | Misses every interaction bug; trivially covers single-input behavior. | 2-wise minimum; 1-wise only for inputs known not to interact. |

## Limitations

- **Pairwise misses N-tuple bugs.** A bug that requires a specific
  triplet to manifest won't be caught by 2-wise alone. Promote to
  3-wise on incident.
- **Constraint logic must be encoded explicitly.** The tool can't
  infer "free tier doesn't have SSO" — the spec must say so.
- **Parameterized tests can hide failure attribution.** When one
  case in 30 fails, the report should clearly identify which
  combination failed; many runners do this well, some don't.
  Verify your runner's parameterized output is informative.

## References

- [ISTQB all-pairs testing](https://glossary.istqb.org/en_US/term/all-pairs-testing)
  — canonical pairwise definition.
- PICT — https://github.com/microsoft/pict
- AllPairs (Python) — https://pypi.org/project/allpairspy/
- [`boundary-value-generator`](../boundary-value-generator/SKILL.md)
  — sibling skill for single-input boundary cases.
- [`negative-test-generator`](../negative-test-generator/SKILL.md)
  — sibling skill for rejection-path coverage.
