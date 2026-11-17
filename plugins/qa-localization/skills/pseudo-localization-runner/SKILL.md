---
name: pseudo-localization-runner
description: "Use when preparing an app for translation, checking localization infrastructure, or when pseudo-localization comes up. Replaces strings with accented, 35%-longer variants to expose hardcoded text, truncation, encoding and bidi problems without real translators."
---

# pseudo-localization-runner

## Overview

Pseudo-localization swaps translatable strings for accented, length-expanded
variants that stay readable to English QA:

```
"Submit" → "Şüƀɱîţ"             # accent / Latin-extended characters
"Submit" → "[Şüƀɱîţ]"            # delimited markers (find unwrapped strings)
"Submit" → "Şüƀɱîţ ↵↵↵"         # 35% length expansion (test truncation)
```

The output stays readable to English-speaking QA while surfacing the l10n
issues catalogued in Step 4.

## When to use

- Pre-translation: validate the app's l10n infrastructure works
  before paying for translation.
- After major UI work: confirm new components handle l10n correctly.
- Continuous: the team's "always-on" l10n smoke test.

## Step 1 - Pick a pseudo-localization library

Per stack:

| Stack            | Library / approach                                  |
|------------------|-----------------------------------------------------|
| FormatJS / react-intl | Built in: `formatjs compile --ast --pseudo-locale <locale>` ([fjs-cli]) |
| i18next (JS/TS)   | `i18next-pseudo` post-processor ([i18p])             |
| Android          | Built-in `en-XA` / `ar-XB` pseudolocales (`pseudoLocalesEnabled` in the debug build) |
| Anything else    | Transform the source locale file with a script that skips placeholders and tags ([references/manual-transform.md](references/manual-transform.md)) |

Never pseudo-localize ICU MessageFormat with a regex over the raw
string: it rewrites the syntax (`{count, plural, one {...}}` keywords,
argument names, `<b>` tags) and the formatter then throws or drops the
markup. Transform the parsed message instead, which is what the FormatJS
CLI does.

## Step 2 - Configure the pseudo-locale

### FormatJS (react-intl)

Per the [FormatJS CLI docs][fjs-cli], `--pseudo-locale` compiles
messages into one of five pseudo-locales, shown for `my name is {name}`:

| Locale  | Output                                       | Finds |
|---------|----------------------------------------------|-------|
| `en-XA` | `[ḿẏ ƞȧȧḿḗḗ īş {name}]`                      | Hardcoded and concatenated text (brackets), font coverage, expansion |
| `en-XB` | `‮ɯʎ uɐɯǝ ıs {name}‬` (bidi override)         | Bidi handling of mixed-direction text |
| `xx-LS` | `my name is {name}SSSSSSSSSSSSSSSSSSSSSSSSS` | Truncation from long strings |
| `xx-AC` | `MY NAME IS {name}`                          | Case-sensitive comparisons on UI text |
| `xx-HA` | `[javascript]my name is {name}`              | Text that is not coming from the catalog |

The docs carry a caution: it "Requires `--ast`". Placeholders, plural
and select branches and rich-text tags survive because the CLI
transforms the parsed AST:

```bash
formatjs extract 'src/**/*.{ts,tsx}' --out-file lang/en.json
formatjs compile lang/en.json --ast --out-file lang/compiled/en.json
formatjs compile lang/en.json --ast --pseudo-locale en-XA --out-file lang/compiled/en-XA.json
formatjs compile lang/en.json --ast --pseudo-locale en-XB --out-file lang/compiled/en-XB.json
```

Load the compiled AST as `messages` for the pseudo-locale in development
and QA builds only:

```tsx
const pseudo = import.meta.env.DEV ? new URLSearchParams(location.search).get('pseudo') : null;
const catalogs = { 'en-XA': enXA, 'en-XB': enXB };          // imported compiled JSON
const locale = pseudo && catalogs[pseudo] ? pseudo : 'en';
document.documentElement.dir = locale === 'en-XB' ? 'rtl' : 'ltr';
<IntlProvider locale={locale} defaultLocale="en" messages={catalogs[locale] ?? en}>
```

`en-XB` reverses and bidi-wraps the text but does not mirror the layout;
set `dir="rtl"` on the document as above to see the mirrored layout
(see `rtl-rendering-tester`).

### i18next (`i18next-pseudo`)

Per the [i18next-pseudo README][i18p] and source, it is a
post-processor: instantiate it with `new`, add `postProcess: ['pseudo']`
to `init`, and note that it only transforms strings when the active
language equals `languageToPseudo` (default `en`). Brackets are off
unless `wrapped: true`.

```typescript
// src/i18n.ts
import Pseudo from 'i18next-pseudo';

const pseudoOn = import.meta.env.DEV;
i18next
  .use(LanguageDetector)
  .use(new Pseudo({ enabled: pseudoOn, languageToPseudo: 'en-XA', wrapped: true }))
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en } },
    fallbackLng: 'en',                 // en-XA has no resources: it falls back to en, then gets pseudo-localized
    postProcess: ['pseudo'],
  });
```

Options: `letterMultiplier` (default 2) repeats the letters listed in
`repeatedLetters` (vowels by default) to lengthen strings; `letters`
maps each letter to its accented look-alike.

## Step 3 - Run the app under the pseudo-locale

Switch the language the way the app's detector reads it. The
[i18next browser language detector][i18det] looks, in order, at
`querystring` (`?lng=`), `hash`, `cookie`, `localStorage`,
`sessionStorage`, `navigator`, `htmlTag`, `path` and `subdomain`, and
caches the result in `localStorage` and a cookie. A single-page app
never sees the request's `Accept-Language` header, so
`extraHTTPHeaders: { 'Accept-Language': 'en-XA' }` in Playwright changes
nothing. Use `?lng=en-XA` (or `?pseudo=en-XA` for the react-intl setup
above), or Playwright's `locale: 'en-XA'` option, which sets
`navigator.language` ([pw-locale]), and start from a clean storage state so a cached
`i18nextLng` does not win.

**Verify the pseudo-locale is active** before walking the UI: at least
one known label must render transformed (with `wrapped: true`, inside
brackets). If it shows plain English, the locale did not activate, and
every later check is meaningless.

## Step 4 - Issues to spot

| Symptom                                       | Underlying issue                          |
|-----------------------------------------------|-------------------------------------------|
| Plain English text on the page                 | String not in the catalog (hardcoded)     |
| Plain English in `placeholder`, `aria-label`, `title`, `alt` or the tab title | Hardcoded attribute text; screen readers and the browser tab still show English |
| Two bracketed pieces with text between them (`[Ŏŕḓḗŕ] 4512 [ͼααṇͼḗḽḽḗḓ]`) | Concatenated message; word order can't be translated. Use one message with interpolation |
| Truncation (`...`) or clipped text             | Fixed width (`width: 96px`), no room for expansion |
| Layout broken (overlapping elements)           | CSS doesn't accommodate longer strings    |
| Missing characters / boxes (`□`)              | Font doesn't support extended Latin       |
| Dates or numbers stay `11/17/2026`, `1,234.50` | Hardcoded locale in `toLocaleString('en-US')` / `Intl` calls |
| Bidi text rendered wrong direction              | Mixing LTR/RTL without isolation (`<bdi>`, `dir`) |

## Step 5 - Automate the check in Playwright

A screenshot test does not catch hardcoded strings: its first run writes
an all-English baseline, and later runs compare against it and pass.
Scan the rendered page instead, and fail on any user-visible text that
did not go through the catalog:

```typescript
// e2e/pseudo-loc.spec.ts (i18next-pseudo with wrapped: true)
import { test, expect } from '@playwright/test';

const ALLOW = [/^\d[\d\s.,:/-]*$/, /^Acme$/];       // numbers, brand names, user data

test('orders page has no hardcoded text', async ({ page }) => {
  await page.goto('/orders?lng=en-XA');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^\[.+\]$/);   // locale is active

  const leaks = await page.evaluate(() => {
    const out: string[] = [];
    // one bracket pair around the whole string; "[a] 42 [b]" is a concatenation and fails
    const isPseudo = (t: string) => /^\[[^\[\]]*\]$/.test(t.trim());
    // rich-text messages split into several text nodes: accept a node if an ancestor holds the whole message
    const inMessage = (el: Element | null) => {
      for (; el && el !== document.body; el = el.parentElement) if (isPseudo(el.textContent ?? '')) return true;
      return false;
    };
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const t = n.textContent!.trim();
      const el = n.parentElement!;
      if (t && el.checkVisibility() && !isPseudo(t) && !inMessage(el)) out.push(`text: ${t}`);
    }
    for (const el of document.querySelectorAll('[placeholder],[aria-label],[title],[alt]'))
      for (const a of ['placeholder', 'aria-label', 'title', 'alt']) {
        const v = el.getAttribute(a)?.trim();
        if (v && !isPseudo(v)) out.push(`${a}: ${v}`);
      }
    if (!isPseudo(document.title)) out.push(`document.title: ${document.title}`);
    return out;
  });
  expect(leaks.filter((l) => !ALLOW.some((re) => re.test(l.split(': ')[1])))).toEqual([]);
});
```

Trigger the transient UI too (toasts, validation errors, empty states)
before scanning: they are where concatenation hides. Add a truncation
check for fixed-size containers (`el.scrollWidth > el.clientWidth`) and
keep a screenshot only as a secondary, layout-level signal.

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

If no pseudo-localization library exists for your stack, transform the source
locale file locally with a one-time script - see
[references/manual-transform.md](references/manual-transform.md).

## Worked example

A team sets up `i18next-pseudo` with `new Pseudo({ languageToPseudo: 'en-XA', wrapped: true })`
and `postProcess: ['pseudo']` (Step 2), then loads `/checkout?lng=en-XA`
(Step 3). The heading renders as `[Ḉḥḛḛͼḳṓṓṵṵṭ]`, so the locale is active.

The Step 5 scan fails with three leaks: `text: Sale` (a promo badge not in
the catalog), `aria-label: Close` (the dialog's close button) and
`text: [Ṓṓṛḍḛḛṛ] 4512 [ṗḽααͼḛḛḍ]` (a toast built by concatenation). The
"Place order" button also clips, because its container is fixed-width.

The developer moves the badge and the label into the catalog, replaces the
toast with one message `order.placed: "Order {{id}} placed"`, and lets the
button grow. The re-run is clean, and a screenshot under `en-XA` stays as a
secondary layout check.

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Pseudo-loc in production                                              | Real users see garbled UI.                                                | Dev / staging only (Step 2). |
| 0% length expansion                                                    | Misses truncation issues.                                                 | 30-50% expansion (Step 2). |
| ASCII-only pseudo-loc                                                  | Misses encoding issues.                                                   | Use accented Latin (or non-Latin script for some chars). |
| Pseudo-loc as substitute for real translation                          | Pseudo-loc verifies infrastructure; not translator quality.              | Use both: pseudo-loc continuously, real translation per release. |
| Relying on a screenshot baseline alone                                 | The first run stores English as the baseline; hardcoded strings pass forever. | Text and attribute scan that fails on unconverted text (Step 5). |
| Regex over ICU messages                                                | Rewrites `plural` / `select` syntax and tags; the formatter throws.     | `formatjs compile --ast --pseudo-locale` (Step 2). |
| `i18next-pseudo` without `postProcess: ['pseudo']`, or `languageToPseudo` not the active language | The plugin never runs; the "pseudo" run shows English. | Step 2, then assert the locale is active (Step 3). |
| Switching the SPA's language with an `Accept-Language` header          | The browser detector reads the query string, storage or `navigator`. | `?lng=` or Playwright `locale` (Step 3). |

## Limitations

- **Doesn't replace real translation.** Pseudo-loc tests the
  infrastructure; humans still need to translate for real users.
- **Doesn't check plural rules of other languages.** FormatJS keeps
  the `plural` and `select` structure intact, but the pseudo-locale uses
  English plural categories; languages with more forms (`few`, `many`)
  still need real translations and tests.
- **Bidi pseudo-locales don't mirror layout.** `en-XB` (FormatJS) and
  `ar-XB` (Android) exercise text direction; layout mirroring still
  needs `dir="rtl"` and `rtl-rendering-tester`.

## References

- [fjs-cli] - FormatJS CLI: `compile --pseudo-locale` locales and the `--ast` requirement.
- [i18p] - i18next-pseudo: `new Pseudo(...)`, `postProcess: ['pseudo']`, options and defaults
  (`languageToPseudo` check in `src/index.js`).
- [i18det] - i18next browser language detector: detection order and caches.
- [pw-locale] - Playwright emulation: `locale` sets `navigator.language`.
- W3C i18n documentation at `w3.org/International/`.
- `i18n-string-coverage` - static-scan complement.
- `rtl-rendering-tester` - RTL-specific tests.
- `playwright-snapshots` - visual regression for catching pseudo-loc regressions.
- [references/manual-transform.md](references/manual-transform.md) - manual transform script.

[fjs-cli]: https://formatjs.github.io/docs/tooling/cli#--pseudo-locale-pseudolocale
[i18p]: https://github.com/MattBoatman/i18next-pseudo
[i18det]: https://github.com/i18next/i18next-browser-languageDetector
[pw-locale]: https://playwright.dev/docs/emulation#locale--timezone
