---
name: locale-format-validator
description: "Build-an-X workflow that verifies locale-specific format rendering - dates (US `5/4/2026` vs ISO `2026-05-04` vs DE `04.05.2026` vs JP `2026/05/04`), numbers (US `1,234.56` vs DE `1.234,56` vs FR `1 234,56`), currencies (US `$1,234.56` vs JP `¥1,235` vs DE `1.234,56 €`), times, durations. Use when the product displays locale-sensitive data and the team needs assurance the formatting matches per-locale conventions."
rating: 22
d6: 3
archetype: S3
---

# locale-format-validator

## Overview

Locale-specific formatting is a common bug source:

- US user sees `5/4/2026` and reads "May 4." Spanish user sees the
  same string and reads "April 5."
- German user sees `1,234.56` and may interpret as 1.23456 (the
  comma is a thousands separator, the period a decimal in DE).
- Japanese user sees a price in dollars instead of yen.

This skill verifies the app uses the right format per locale.

## When to use

- The product displays dates, numbers, currencies, or times.
- A bug report says "the date is in the wrong format."
- Pre-release: scheduled locale-format check.

## Step 1 - Identify the formatting library

| Stack          | Library                                                |
|----------------|--------------------------------------------------------|
| JS / browser    | `Intl.DateTimeFormat` / `Intl.NumberFormat` (built-in) |
| React           | `react-intl` (FormatJS) `<FormattedDate>`               |
| Python          | `babel.dates` / `babel.numbers`                          |
| Java            | `DateTimeFormatter` / `NumberFormat` with Locale         |
| Ruby on Rails   | `I18n.l(date, format: :long)` / `number_to_currency`    |
| .NET            | `CultureInfo` + `ToString("d", culture)`                  |

The Intl APIs (browser-native) are recommended - they delegate to
the underlying ICU library for canonical CLDR-based formatting.

## Step 2 - Date format expectations per locale

| Locale  | Short date | Medium     | Long                         |
|---------|------------|------------|------------------------------|
| en-US   | 5/4/2026   | May 4, 2026 | May 4, 2026                  |
| en-GB   | 04/05/2026 | 4 May 2026 | 4 May 2026                   |
| de-DE   | 04.05.2026 | 04.05.2026 | 4. Mai 2026                  |
| fr-FR   | 04/05/2026 | 4 mai 2026 | 4 mai 2026                   |
| ja-JP   | 2026/05/04 | 2026/05/04 | 2026年5月4日                  |
| zh-CN   | 2026/5/4   | 2026年5月4日 | 2026年5月4日                  |

US and DE date formats look superficially similar (differ only in
separator) but are unambiguously interpreted only in their locale.

## Step 3 - Number format expectations

| Locale  | 1234.56          | 1234567        |
|---------|------------------|----------------|
| en-US   | 1,234.56         | 1,234,567      |
| en-GB   | 1,234.56         | 1,234,567      |
| de-DE   | 1.234,56         | 1.234.567      |
| fr-FR   | 1 234,56          | 1 234 567       |  (NB: thin space, U+202F)
| ar-SA   | ١٬٢٣٤٫٥٦         | ١٬٢٣٤٬٥٦٧      |  (Arabic-Indic digits)
| hi-IN   | 1,234.56         | 12,34,567      |  (Indian grouping: lakh, crore)

The Indian grouping (lakh = 100,000 displayed as `1,00,000`) is a
common bug source for apps using only Western thousands grouping.

## Step 4 - Currency expectations

| Locale  | $1234.56 USD   | €1234.56 EUR   | ¥1234 JPY    |
|---------|----------------|----------------|--------------|
| en-US   | $1,234.56      | €1,234.56      | ¥1,234       |
| de-DE   | 1.234,56 $     | 1.234,56 €     | 1.234 ¥      |
| fr-FR   | 1 234,56 $     | 1 234,56 €     | 1 234 ¥      |
| ja-JP   | $1,234.56      | €1,234.56      | ¥1,234       |

Notes:
- Euro symbol position varies (€-DE vs DE-€ in some renderings).
- JPY has no decimals.
- Currency symbol may precede or follow per locale.

## Step 5 - Author tests

```typescript
import { test, expect } from '@playwright/test';

test('date format per locale', async ({ page }) => {
  // en-US
  await page.goto('/orders/123?lng=en-US');
  await expect(page.getByTestId('order-date')).toHaveText('5/4/2026');

  // de-DE
  await page.goto('/orders/123?lng=de-DE');
  await expect(page.getByTestId('order-date')).toHaveText('04.05.2026');

  // ja-JP
  await page.goto('/orders/123?lng=ja-JP');
  await expect(page.getByTestId('order-date')).toHaveText('2026/05/04');
});

test('currency format per locale', async ({ page }) => {
  await page.goto('/orders/123?lng=de-DE');
  await expect(page.getByTestId('order-total')).toHaveText('1.234,56 €');

  await page.goto('/orders/123?lng=ja-JP&currency=JPY');
  await expect(page.getByTestId('order-total')).toHaveText('¥1,235');   // no decimals
});

test('number format per locale', async ({ page }) => {
  await page.goto('/dashboard?lng=hi-IN&users=1234567');
  await expect(page.getByTestId('user-count')).toHaveText('12,34,567');   // Indian grouping
});
```

## Step 6 - Time + timezone

A separate concern: timestamps must show in the user's timezone:

```typescript
test('order time displays in user timezone', async ({ page }) => {
  await page.goto('/orders/123?lng=en-US&tz=America/New_York');
  await expect(page.getByTestId('order-time')).toContainText('EST');

  await page.goto('/orders/123?lng=ja-JP&tz=Asia/Tokyo');
  await expect(page.getByTestId('order-time')).toContainText('JST');
});
```

## Step 7 - Locale matrix in CI

```yaml
- name: Locale-format tests
  run: |
    for locale in en-US en-GB de-DE fr-FR ja-JP zh-CN ar-SA hi-IN; do
      LOCALE=$locale npx playwright test e2e/locale-formats/
    done
```

Or via Playwright projects:

```typescript
// playwright.config.ts
projects: [
  { name: 'en-US', use: { locale: 'en-US' } },
  { name: 'de-DE', use: { locale: 'de-DE' } },
  // ...
],
```

## Step 8 - CLDR as source of truth

The Unicode Common Locale Data Repository (CLDR) is the canonical
source for locale data. Modern Intl libraries delegate to ICU
which delegates to CLDR.

For verification, consult the CLDR data at `cldr.unicode.org/`.
The format conventions in this skill come from CLDR; the actual
expected strings should be derived from CLDR per locale, not
hand-coded.

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Hand-coded format strings                                              | Drift from canonical CLDR; locale assumptions break.                     | Use Intl APIs / `Intl.DateTimeFormat`. |
| Universal "1,234.56" thousands grouping                                | Wrong for de-DE, fr-FR, hi-IN, etc.                                      | Per-locale via Intl. |
| US-only date format                                                     | "5/4/2026" ambiguous internationally.                                    | ISO 8601 (`2026-05-04`) for storage; locale-specific for display. |
| JPY with decimals                                                       | JPY has no decimal subdivision.                                           | Per-currency precision; Intl handles automatically. |
| Timezone-naive timestamps                                               | "Order placed at 14:00" - but in whose timezone?                        | Always include TZ; convert to user's TZ for display (Step 6). |

## Limitations

- **Bicultural users.** A Hindi user with English UI prefers
  Indian grouping; user-preference UI overrides locale auto-detection.
- **CLDR updates.** New CLDR releases sometimes change formatting;
  pin a CLDR version for stable test expectations.
- **Server-vs-client formatting.** Inconsistent if both render
  formats with different libraries; pick one.
- **Intl API gaps.** Some niche locales / formats are
  underrepresented in browser Intl; libraries like FormatJS fill
  some gaps.

## References

- W3C i18n at `w3.org/International/`.
- CLDR at `cldr.unicode.org/`.
- [`i18n-string-coverage`](../i18n-string-coverage/SKILL.md),
  [`pseudo-localization-runner`](../pseudo-localization-runner/SKILL.md),
  [`rtl-rendering-tester`](../rtl-rendering-tester/SKILL.md) - 
  sibling skills for the broader l10n test surface.
