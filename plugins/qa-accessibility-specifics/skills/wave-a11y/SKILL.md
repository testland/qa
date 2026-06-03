---
name: wave-a11y
description: "Runs WebAIM WAVE accessibility scans via the WAVE API or the browser-extension UI - produces visual overlay of errors / alerts / structural elements directly on the page, plus categorized JSON output for CI use. Use when the team values manual-review-friendly visual feedback (the WAVE overlay) alongside automated CI scans, or when a regulatory audit requires WebAIM-branded reports."
rating: 23
d6: 4
---

# wave-a11y

## Overview

WAVE (Web Accessibility Evaluation Tool) is WebAIM's flagship a11y
scanner - distinguished by its **visual overlay** that places
icons directly on a rendered page showing errors, alerts, and
structural elements. It runs via:

- **Browser extension** - manual, immediate, visual.
- **WAVE API** - programmatic scans against any URL.
- **Standalone library (Stand-Alone API)** - for self-hosted
  scanning.

The WAVE convention is to categorize findings into: **errors**
(definite WCAG failures), **alerts** (likely issues needing
review), **features** (positive a11y patterns to celebrate),
**structural elements** (landmarks, headings), **HTML5 / ARIA**
(machine-readable semantics), **contrast errors** (color contrast
specifically).

> **Source-fetch note (2026-05-04):** WAVE's documentation lives
> across `wave.webaim.org`, `webaim.org/articles`, and tool-
> specific subpages. This skill cites WebAIM as the canonical
> source for WAVE conventions; the API specifics may evolve - 
> verify the current WAVE API v3+ documentation at
> `wave.webaim.org/api` before authoring CI integrations against
> specific endpoints.

## When to use

- A regulatory audit requires WebAIM-branded reports (common in
  US public-sector and education compliance work).
- The team includes designers / non-technical reviewers who
  benefit from the visual overlay.
- Auditing a third-party / external site without code access - 
  WAVE works against any public URL.
- Cross-checking automated axe / pa11y findings - WAVE's
  classification differs slightly and surfaces different
  presentation issues.

If the goal is purely automated CI gating without visual review,
[`axe-a11y`](../axe-a11y/SKILL.md) and
[`pa11y-a11y`](../pa11y-a11y/SKILL.md) are simpler and free.

## Install / access

| Method                                  | Cost                       |
|-----------------------------------------|----------------------------|
| Browser extension (Chrome / Firefox / Edge) | Free.                      |
| WAVE API                                | Free credits + paid tiers (per WebAIM). |
| Stand-Alone API (self-hosted server)     | Commercial license.        |

For programmatic CI integration, the WAVE API is the canonical
path; pricing / signup at `wave.webaim.org/api`.

## Manual usage (extension)

1. Install the WAVE extension from Chrome Web Store / Firefox AMO.
2. Navigate to the page under test.
3. Click the WAVE icon → the page reloads with the overlay.
4. Review icons placed on the page:
   - Red **error** icons mark definite failures.
   - Yellow **alert** icons mark likely issues needing review.
   - Green **feature** icons mark good patterns.
   - Purple **structural** icons mark landmarks / headings.
   - Blue **HTML5/ARIA** icons mark semantic elements.
5. Click the "Details" tab in the WAVE sidebar for per-icon
   explanations.

The visual feedback is the WAVE differentiator - designers can
review without reading text reports.

## Programmatic usage (API)

```bash
curl 'https://wave.webaim.org/api/request?key=YOUR_KEY&url=https://example.com&reporttype=4'
```

Reporttype 4 returns the full JSON. The response includes:

```json
{
  "status": { "success": true, "httpstatuscode": 200 },
  "statistics": {
    "pagetitle": "Example",
    "pageurl": "https://example.com/",
    "totalelements": 423,
    "allitemcount": 12,
    "errorcount": 3,
    "alertcount": 5,
    "featurecount": 4,
    ...
  },
  "categories": {
    "error": { "items": { ... } },
    "alert": { "items": { ... } },
    "feature": { ... },
    "structure": { ... },
    "html5": { ... },
    "contrast": { "items": { ... } }
  }
}
```

Per category, `items` is keyed by the WAVE issue code (e.g.
`alt_missing`, `label_missing`, `contrast`); each entry has
`description`, `count`, `selectors[]`, and per-instance
`xpath` / `selector` / `html`.

Pipe to `jq` for triage:

```bash
# All error-level codes + counts
jq -r '.categories.error.items | to_entries[] | "\(.key): \(.value.count)"' wave-results.json

# Failing selectors per issue
jq -r '.categories.error.items | to_entries[] | .value.selectors[] | tostring' wave-results.json
```

## CI integration

The CI pattern uses the WAVE API:

```yaml
# .github/workflows/wave.yml
name: wave-a11y

on:
  pull_request:
    paths: ['src/**']

jobs:
  wave:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - name: Run WAVE scan via API
        env:
          WAVE_API_KEY: ${{ secrets.WAVE_API_KEY }}
        run: |
          # Scan each URL the project cares about
          for url in https://staging.example.com/ https://staging.example.com/dashboard; do
            slug=$(echo "$url" | tr '/:' '__')
            curl -sS "https://wave.webaim.org/api/request?key=$WAVE_API_KEY&url=$url&reporttype=4" \
              > "wave-$slug.json"
          done

      - name: Upload reports
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: wave-reports
          path: wave-*.json
          retention-days: 14

      - name: Gate via violation-gate
        run: python scripts/run_a11y_gate.py wave-*.json
```

The gate logic lives in [`a11y-violation-gate`](../a11y-violation-gate/SKILL.md);
this CI workflow's job is to capture the WAVE outputs.

## Anti-patterns

| Anti-pattern                                                    | Why it fails                                                       | Fix |
|-----------------------------------------------------------------|---------------------------------------------------------------------|-----|
| Treating "alerts" as errors                                       | Alerts are flagged for human review, not auto-fail.                 | Block on errors; route alerts to the review process. |
| Storing WAVE API key in committed config                          | Key leak; quota theft.                                              | Always in CI secrets. |
| Running WAVE against production                                    | API hits load production; possible PII leakage in scan data.        | Always staging or pre-prod. |
| Using WAVE alone without axe / pa11y                              | WAVE has different rule coverage; misses some structural / ARIA issues. | Pair with [`axe-a11y`](../axe-a11y/SKILL.md) for full coverage. |
| Ignoring "contrast errors" because they're "not real bugs"        | Contrast errors are SC 1.4.3 violations - definite WCAG failures.  | Treat as errors; aggregate via gate. |

## Limitations

- **Authenticated pages.** The WAVE API can't authenticate; it
  scans public URLs only. For auth-required pages, run the
  Stand-Alone API or use the extension manually.
- **Single-page-applications.** Some SPA routes don't have
  meaningful URLs without parameters; WAVE's URL-based scanning
  may not match the user's actual journey.
- **Quotas / costs.** The free WAVE API tier has limits;
  high-traffic CI usage requires a paid tier.
- **Different rule coverage.** WAVE finds a slightly different
  set of issues than axe / pa11y - it's complementary, not
  replacing.

## References

- WAVE landing page - https://wave.webaim.org/
- WAVE API documentation - https://wave.webaim.org/api/
- WebAIM (the organization behind WAVE) - https://webaim.org/
- W3C WCAG 2.2 - https://www.w3.org/TR/WCAG22/
- [`axe-a11y`](../axe-a11y/SKILL.md),
  [`pa11y-a11y`](../pa11y-a11y/SKILL.md),
  [`lighthouse-a11y`](../lighthouse-a11y/SKILL.md) - 
  alternative scanners.
- [`a11y-violation-gate`](../a11y-violation-gate/SKILL.md) - CI
  gate aggregating WAVE + sibling-scanner results.
