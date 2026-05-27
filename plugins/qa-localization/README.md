# qa-localization

Localization (l10n) and internationalization (i18n) testing — closes the entirely-missing localization category in the existing ecosystem.

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| Skill | [i18n-string-coverage](skills/i18n-string-coverage/SKILL.md) | S3 | Build-an-X workflow that scans source code for untranslated strings — finds hardcoded user-facing text not wrapped in the i18n function (`t()`, `i18n.t`, `gettext`, `__()`, etc.), maps gaps to the team''''s translation file, reports per-language coverage (en: 100%; fr: 87%; es: 60%), gates per-PR for new untranslated strings. Use when the product ships in multiple locales and the team needs continuous coverage tracking. |
| Skill | [pseudo-localization-runner](skills/pseudo-localization-runner/SKILL.md) | S1 | Configures pseudo-localization for the app (replaces translatable strings with accented variants like \"Submit\" → \"Şüƀɱîţ\" + 35% length expansion) — surfaces UI issues without needing actual translators: hardcoded strings (any English remaining is unwrapped), truncation (text overflows), encoding (non-ASCII characters break), bidi handling (mixed scripts). Use as the lowest-cost pre-translation l10n smoke test. |
| Skill | [rtl-rendering-tester](skills/rtl-rendering-tester/SKILL.md) | S3 | Build-an-X workflow for verifying RTL (right-to-left) layouts — runs the test suite under Arabic / Hebrew / Persian / Urdu locales, asserts the `dir=\"rtl\"` attribute is set, verifies layout mirrors correctly (text alignment, icon positions, scrollbar location), uses logical CSS properties (`start`/`end` over `left`/`right`) per W3C guidance, captures per-locale screenshots for visual review. Use when the app supports RTL languages. |
| Skill | [locale-format-validator](skills/locale-format-validator/SKILL.md) | S3 | Build-an-X workflow that verifies locale-specific format rendering — dates (US `5/4/2026` vs ISO `2026-05-04` vs DE `04.05.2026` vs JP `2026/05/04`), numbers (US `1,234.56` vs DE `1.234,56` vs FR `1 234,56`), currencies (US `$1,234.56` vs JP `¥1,235` vs DE `1.234,56 €`), times, durations. Use when the product displays locale-sensitive data and the team needs assurance the formatting matches per-locale conventions. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-localization@testland-qa
```

## Rating

All components in this plugin pass the v4.0 quality gate
(8 dimensions, 0-40 scale, importable bar 28/40). CI enforces total
>=21/30 with d6 >=1 (v2.0 floor); D7 (eval coverage) and D8 (best-practices
adherence) are advisory through the shadow window. See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) for the
rubric.
