# a11y-violation-gate: scanner shapes and artifact template

Detail moved out of SKILL.md to keep the core gate script lean. The
runnable gate (axe-core ingestion) is in SKILL.md Step 3; extend it
to the other four scanners using the shapes below, then emit the PR
artifact with the template at the end of this file.

## Scanner native output shapes

| Scanner          | Native output                                             |
|------------------|-----------------------------------------------------------|
| axe-core         | JSON with `violations[]`; rule ID, impact, nodes.         |
| pa11y            | JSON with `issues[]`; code (WCAG SC), type.               |
| Lighthouse a11y  | LHR JSON with `categories.accessibility.audits`.          |
| WAVE             | JSON via WebAIM API; `categories` with errors / warnings. |
| IBM Equal Access | JSON with `results[]`.                                    |

## Normalizing the other scanners

Each scanner is read the same way as axe-core: pull its findings
array (the second column above), map its native fields onto the
unified record `{scanner, rule_id, wcag_sc, page_url, selector,
severity}`, and build the same fingerprint
`f"{scanner}::{rule_id}::{page_url}::{selector}"`. A finding whose
fingerprint reappears on the next run is the same violation; a new
fingerprint is a new violation.

## Full PR artifact template

Render for `$GITHUB_STEP_SUMMARY` or a PR comment:

```markdown
# A11y Gate - verdict: NO-GO

**Blockers (NEW violations): 2**

| Scanner | Rule              | WCAG SC | Page         | Selector            | Severity |
|---------|-------------------|---------|--------------|---------------------|----------|
| axe     | color-contrast    | 1.4.3   | /checkout    | button.primary      | serious  |
| axe     | aria-required-attr | 4.1.2  | /checkout    | div[role="dialog"]  | critical |

**Warnings (NEW moderate): 1**

| Scanner | Rule          | WCAG SC | Page         | Selector |
|---------|---------------|---------|--------------|----------|
| pa11y   | landmark-one-main | 1.3.1 | /checkout | (page-level) |

**Grandfathered (in baseline): 47**
**Fixed since baseline: 5**  (positive trend)

## Recommended next step

Block-tier violations must be fixed in this PR. To address the
two blockers:
- `button.primary` on `/checkout`: contrast ratio 3.8:1; needs >=4.5:1.
- `div[role="dialog"]`: missing `aria-labelledby` or `aria-label`.
```

A no-go verdict exits non-zero so CI halts.
