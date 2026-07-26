# Pairwise output formats

Reference detail for [pairwise-test-case-generator](../SKILL.md): the
reduced case set emitted in each test-runner-native parametrize format.

## Pairwise CSV (PICT-style)

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

## pytest

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

## Jest / Vitest

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

## xUnit (.NET)

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
