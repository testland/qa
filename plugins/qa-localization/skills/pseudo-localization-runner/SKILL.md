---
name: pseudo-localization-runner
description: "Configures pseudo-localization for the app (replaces translatable strings with accented variants like \"Submit\" → \"Şüƀɱîţ\" + 35% length expansion) - surfaces UI issues without needing actual translators: hardcoded strings (any English remaining is unwrapped), truncation (text overflows), encoding (non-ASCII characters break), bidi handling (mixed scripts). Use as the lowest-cost pre-translation l10n smoke test."
rating: 22
d6: 3
archetype: S1
---

# pseudo-localization-runner

## Overview

Pseudo-localization is the practitioner technique for testing l10n
**without** real translations. Instead of translating "Submit" to
French ("Soumettre"), the pseudo-localizer transforms it to
something visually distinct but readable:

```
"Submit" → "Şüƀɱîţ"             # accent / Latin-extended characters
"Submit" → "[Şüƀɱîţ]"            # delimited markers (find unwrapped strings)
"Submit" → "Şüƀɱîţ ↵↵↵"         # 35% length expansion (test truncation)
```

The transformed string:

- **Stays readable** to QA (English speakers can still tell what
  it means).
- **Surfaces unwrapped strings** (any pure-ASCII English text is a
  gap).
- **Tests truncation** (length-expansion catches UIs that don't
  scale).
- **Tests encoding** (non-ASCII characters expose Unicode
  handling bugs).

## When to use

- Pre-translation: validate the app's l10n infrastructure works
  before paying for translation.
- After major UI work: confirm new components handle l10n correctly.
- Continuous: the team's "always-on" l10n smoke test.

## Step 1 - Pick a pseudo-localization library

Per stack:

| Stack            | Library / approach                                  |
|------------------|-----------------------------------------------------|
| i18next (JS/TS)   | `i18next-pseudo` plugin                              |
| FormatJS         | Manual middleware in the message extractor          |
| Django           | `django-modeltranslation` + custom locale            |
| Rails            | `i18n-pseudo`                                         |
| Anything         | Build custom: walk the locale file; transform values |

## Step 2 - Configure pseudo-locale

```typescript
// src/i18n.ts (i18next + i18next-pseudo)
import Pseudo from 'i18next-pseudo';

i18next
  .use(Pseudo)
  .init({
    fallbackLng: 'en',
    pseudo: {
      enabled: process.env.NODE_ENV !== 'production',
      letterMultiplier: 2,         // ~35% length expansion
      languageToPseudo: 'en',       // wrap English strings
      repeatedLetters: ['a', 'e', 'i', 'o', 'u'],
    },
  });
```

The `letterMultiplier: 2` doubles vowels (Şü → Şüü) - the 35%
length-expansion convention.

## Step 3 - Run the app under pseudo-locale

```bash
# Activate pseudo-locale by URL param / cookie
APP_URL=http://localhost:3000?lng=en-XA   # or whatever the pseudo-locale code is
```

The app renders with pseudo-translated text. QA / engineers walk
the UI looking for issues.

## Step 4 - Issues to spot

| Symptom                                       | Underlying issue                          |
|-----------------------------------------------|-------------------------------------------|
| Pure-English text on the page                  | String not wrapped in `t()` (untranslated) |
| Truncation (`...`)                              | Container too narrow for translated text |
| Layout broken (overlapping elements)           | CSS doesn't accommodate longer strings    |
| Mojibake / garbled characters                  | Encoding misconfigured                     |
| Missing characters / boxes (`□`)              | Font doesn't support extended Latin       |
| Bidi text rendered wrong direction              | Mixing LTR/RTL without proper markers     |

## Step 5 - Visual regression with pseudo-locale

Combine with [`playwright-snapshots`](../../qa-visual-regression/skills/playwright-snapshots/SKILL.md)
for automated detection:

```typescript
// e2e/pseudo-loc.spec.ts
import { test, expect } from '@playwright/test';

test.use({ extraHTTPHeaders: { 'Accept-Language': 'en-XA' } });

test('checkout page renders correctly under pseudo-loc', async ({ page }) => {
  await page.goto('/checkout');
  await expect(page).toHaveScreenshot('checkout-pseudo.png');
});
```

The screenshot baseline is established under pseudo-locale; future
runs catch regressions in l10n-friendliness.

## Step 6 - CI integration

```yaml
- name: Pseudo-localization smoke
  run: |
    npm run dev:pseudo &
    sleep 5
    npx playwright test e2e/pseudo-loc.spec.ts
- uses: actions/upload-artifact@v4
  if: failure()
  with:
    name: pseudo-loc-screenshots
    path: test-results/
```

## Step 7 - Alternative: manual transformation

If no library is available, transform locally:

```javascript
// scripts/pseudo-loc.js
function pseudoLocalize(s) {
  const map = { a: 'à', e: 'è', i: 'ì', o: 'ò', u: 'ù',
                A: 'Á', E: 'É', I: 'Í', O: 'Ó', U: 'Ú',
                s: 'š', t: 'ţ' };
  let out = '';
  for (const c of s) {
    out += map[c] || c;
    if ('aeiouAEIOU'.includes(c)) out += c;   // duplicate vowels for 35% length
  }
  return `[${out}]`;   // delimiters help spot incomplete wraps
}
```

The transform is a one-time pass over the source locale file.

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Pseudo-loc in production                                              | Real users see garbled UI.                                                | Dev / staging only (Step 2). |
| 0% length expansion                                                    | Misses truncation issues.                                                 | 30-50% expansion (Step 2). |
| ASCII-only pseudo-loc                                                  | Misses encoding issues.                                                   | Use accented Latin (or non-Latin script for some chars). |
| Pseudo-loc as substitute for real translation                          | Pseudo-loc verifies infrastructure; not translator quality.              | Use both: pseudo-loc continuously, real translation per release. |
| Skipping screenshot baseline under pseudo-loc                          | Layout regressions visible only when locale activated.                   | Pseudo-loc + visual regression (Step 5). |

## Limitations

- **Doesn't replace real translation.** Pseudo-loc tests the
  infrastructure; humans still need to translate for real users.
- **Can't test pluralization rules.** ICU MessageFormat rules
  don't auto-apply; pseudo-loc just transforms the surface text.
- **Right-to-left support varies.** Some libraries also offer a
  RTL pseudo-locale (`en-XB`) that mirrors text direction; valuable
  but rare.

## References

- W3C i18n documentation at `w3.org/International/`.
- [`i18n-string-coverage`](../i18n-string-coverage/SKILL.md) - 
  static-scan complement.
- [`rtl-rendering-tester`](../rtl-rendering-tester/SKILL.md) - 
  RTL-specific tests.
- [`playwright-snapshots`](../../qa-visual-regression/skills/playwright-snapshots/SKILL.md) - visual regression for catching pseudo-loc regressions.
