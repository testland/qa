---
name: i18n-string-coverage
description: "Build-an-X workflow that scans source code for untranslated strings - finds hardcoded user-facing text not wrapped in the i18n function (`t()`, `i18n.t`, `gettext`, `__()`, etc.), maps gaps to the team''''s translation file, reports per-language coverage (en: 100%; fr: 87%; es: 60%), gates per-PR for new untranslated strings. Use when the product ships in multiple locales and the team needs continuous coverage tracking."
---

# i18n-string-coverage

## Overview

Localized products fail in two ways:

1. **Untranslated strings:** "Submit" appears in English in a French
   UI because the developer hardcoded it.
2. **Gaps in translation files:** the key exists in `en.json` but
   not `fr.json`; the UI shows the key (e.g., "checkout.submit")
   instead of text.

This skill detects both via source scanning + translation-file
diff.

## When to use

- The product ships in 2+ locales.
- A bug report says "X appears in English in Y locale."
- Quarterly: scheduled coverage review.
- A new locale launches and the team needs the gap inventory.

## Step 1 - Identify the i18n library

Per stack, the wrap function differs:

| Stack          | Wrap function                                    |
|----------------|--------------------------------------------------|
| react-i18next  | `t('key')` / `useTranslation()`                   |
| i18next        | `i18next.t('key')`                                |
| Vue i18n       | `$t('key')`                                       |
| Angular i18n   | `i18n` attribute / `$localize\`...\``             |
| Django         | `gettext('text')` / `_('text')` / `{% trans %}`   |
| Rails          | `I18n.t('key')` / `t('key')` (in views)            |
| FormatJS       | `intl.formatMessage({ id: 'key' })`               |
| .NET           | `Resources.SubmitButton`                           |

Configure per project.

## Step 2 - Scan for untranslated strings

```bash
# Pattern: JSX/TSX text children that aren't wrapped
# (heuristic; refines per-codebase)
grep -rn -E '>[A-Z][a-z]+ ?[A-Za-z ]*<' src/components/ \
  | grep -v -E '\$?\{?t\(|i18n\.t\(|trans|formatMessage'
```

This catches the obvious cases - `<button>Submit</button>` - 
without false-positive on `<button>{t('submit')}</button>`.

For more comprehensive detection, language-specific tooling:

| Tool                   | Use                                                |
|------------------------|----------------------------------------------------|
| `i18n-extract` (npm)    | JS/TS - extracts keys + finds missing             |
| `eslint-plugin-i18next` | JS/TS - ESLint rule for unwrapped strings         |
| `pylint-django-i18n`    | Django - pylint plugin                              |
| `i18nspector` (Debian)   | Lints `.po` files                                   |
| `xgettext`              | Cross-language: extracts strings from source       |

## Step 3 - Diff translation files

```python
# scripts/i18n-coverage.py
import json
from pathlib import Path

base = json.loads(Path('locales/en.json').read_text())   # source-of-truth
base_keys = set(flatten(base))

per_locale_coverage = {}
for locale_file in Path('locales').glob('*.json'):
    locale = locale_file.stem
    if locale == 'en': continue
    locale_keys = set(flatten(json.loads(locale_file.read_text())))
    missing = base_keys - locale_keys
    extra = locale_keys - base_keys
    per_locale_coverage[locale] = {
        'covered': len(base_keys & locale_keys),
        'missing': sorted(missing),
        'extra_orphans': sorted(extra),
        'pct': round(100 * len(base_keys & locale_keys) / len(base_keys), 1),
    }

print(json.dumps(per_locale_coverage, indent=2))

def flatten(d, prefix=''):
    for k, v in d.items():
        full = f'{prefix}.{k}' if prefix else k
        if isinstance(v, dict):
            yield from flatten(v, full)
        else:
            yield full
```

## Step 4 - Report

```markdown
## i18n coverage report — `<sha>`

**Locales:** 5 (en source + 4 targets)
**Total keys (en):** 542
**Untranslated source strings:** 18 (newly flagged)

### Per-locale coverage

| Locale | Coverage | Missing keys | Orphan keys | Recent additions  |
|--------|---------:|-------------:|------------:|-------------------|
| de      |   100%   |      0       |     2       |    +5             |
| fr      |    98%   |     12       |     0       |    +5             |
| es      |    87%   |     71       |     0       |    +5             |
| ja      |    60%   |    218       |     0       |    +5             |

### New untranslated strings in this PR

| File                              | Line | String                          | Suggested key                       |
|-----------------------------------|------|---------------------------------|-------------------------------------|
| `src/checkout/PromoBanner.tsx`     |  18  | "Apply your discount"            | `checkout.promo.banner_cta`          |
| `src/cart/EmptyCart.tsx`            |  12  | "Your cart is empty"             | `cart.empty_message`                 |

### Orphan keys (in locale file but not in source)

These keys exist in `de.json` but no longer in source — likely
deprecated. Recommend deletion:

- `legacy.old_promo_text`
- `legacy.old_checkout_button`
```

## Step 5 - PR gate

```yaml
- name: i18n coverage check
  if: github.event_name == 'pull_request'
  run: |
    NEW_UNWRAPPED=$(./scripts/i18n-scan.sh)
    if [ -n "$NEW_UNWRAPPED" ]; then
      echo "::error::New untranslated strings found:"
      echo "$NEW_UNWRAPPED"
      exit 1
    fi
```

For new locales without 100% coverage, gate is informational, not
blocking - the gap is tracked, not blocked.

## Step 6 - Bilingual / RTL flagging

For RTL languages (Arabic, Hebrew, Persian, Urdu - per
[w3-rtl][w3rtl]), the report also flags:

[w3rtl]: https://www.w3.org/International/questions/qa-html-dir

- Strings that include hardcoded LTR/RTL marker characters.
- Strings with embedded HTML (often direction-sensitive).
- Strings combining RTL and LTR text (need bidi handling).

These need extra translator attention even when
"translated" - character-by-character translation may not
render correctly without bidi guidance.

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Heuristic-only string scanning (no whitelist for known-non-text)      | False positives on technical strings (URLs, IDs).                        | Whitelist patterns; tune per project. |
| Treating English as auto-100%                                          | New en strings without keys are still gaps in source-of-truth.           | All locales (including en) must have keys for new strings. |
| Scanning generated code                                                | False positives flood the report.                                        | Exclude `dist/`, `build/`, `node_modules/`. |
| Ignoring orphans                                                        | Translation files bloat over time.                                       | Surface orphans (Step 4 example); periodic cleanup. |
| Per-locale gates blocking new locale launches                          | Defeats the goal; team disables.                                         | Gate is informational for incomplete locales (Step 5). |

## Limitations

- **Heuristic scanning has gaps.** Dynamically-constructed strings
  (e.g., `t(dynamicKey)`) miss; manual review required.
- **Translator quality not addressed.** "Translated" doesn't mean
  "good translation"; pair with linguistic review.
- **Per-language differences in pluralization, gender, etc.** Some
  i18n libraries handle these well (ICU MessageFormat); others
  poorly. Coverage % doesn't reflect quality.

## References

- [w3rtl][w3rtl] - W3C on `dir` attribute + RTL languages.
- [`pseudo-localization-runner`](../pseudo-localization-runner/SKILL.md) - sibling: layout-level i18n testing.
- [`rtl-rendering-tester`](../rtl-rendering-tester/SKILL.md) - 
  RTL-specific rendering verification.
- [`locale-format-validator`](../locale-format-validator/SKILL.md) - date / number / currency format verification.
