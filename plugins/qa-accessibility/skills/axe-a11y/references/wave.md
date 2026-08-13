# WAVE - WebAIM's visual-overlay scanner

Companion reference for `axe-a11y`. Consult when a regulatory audit requires
WebAIM-branded reports (common in US public-sector / education compliance),
when designers or non-technical reviewers need the visual overlay, when
auditing a third-party site without code access, or to cross-check axe /
pa11y findings. For purely automated CI gating, direct axe (SKILL.md) and
pa11y are simpler and free.

WAVE (Web Accessibility Evaluation Tool) is WebAIM's flagship scanner -
distinguished by a **visual overlay** that places icons directly on the
rendered page. It runs via browser extension (manual, visual), the WAVE API
(programmatic), or the commercial Stand-Alone API (self-hosted).

WAVE categorizes findings into: **errors** (definite WCAG failures),
**alerts** (likely issues needing review), **features** (positive patterns),
**structural elements** (landmarks, headings), **HTML5 / ARIA** semantics,
and **contrast errors**.

> **Source-fetch note (2026-05-04):** WAVE's documentation lives across
> `wave.webaim.org` and `webaim.org/articles`; the API specifics may evolve -
> verify the current WAVE API v3+ documentation at `wave.webaim.org/api`
> before authoring CI integrations against specific endpoints.

## Access

| Method                                      | Cost                                    |
|---------------------------------------------|-----------------------------------------|
| Browser extension (Chrome / Firefox / Edge) | Free.                                   |
| WAVE API                                    | Free credits + paid tiers (per WebAIM). |
| Stand-Alone API (self-hosted server)        | Commercial license.                     |

## Manual usage (extension)

1. Install the WAVE extension; navigate to the page under test.
2. Click the WAVE icon - the page reloads with the overlay: red **error**
   icons (definite failures), yellow **alert**, green **feature**, purple
   **structural**, blue **HTML5/ARIA**.
3. The "Details" sidebar tab gives per-icon explanations.

## Programmatic usage (API)

```bash
curl 'https://wave.webaim.org/api/request?key=YOUR_KEY&url=https://example.com&reporttype=4'
```

Reporttype 4 returns the full JSON: a `statistics` block
(`errorcount`, `alertcount`, `featurecount`, ...) and a `categories` object
(`error` / `alert` / `feature` / `structure` / `html5` / `contrast`). Per
category, `items` is keyed by WAVE issue code (e.g. `alt_missing`,
`label_missing`, `contrast`); each entry has `description`, `count`,
`selectors[]`, and per-instance `xpath` / `selector` / `html`.

`jq` triage:

```bash
# All error-level codes + counts
jq -r '.categories.error.items | to_entries[] | "\(.key): \(.value.count)"' wave-results.json

# Failing selectors per issue
jq -r '.categories.error.items | to_entries[] | .value.selectors[] | tostring' wave-results.json
```

## CI integration

Capture WAVE API JSON per URL and feed it to the gate
(`a11y-violation-gate` owns the gate logic):

```yaml
- name: Run WAVE scan via API
  env:
    WAVE_API_KEY: ${{ secrets.WAVE_API_KEY }}
  run: |
    for url in https://staging.example.com/ https://staging.example.com/dashboard; do
      slug=$(echo "$url" | tr '/:' '__')
      curl -sS "https://wave.webaim.org/api/request?key=$WAVE_API_KEY&url=$url&reporttype=4" \
        > "wave-$slug.json"
    done
```

## Anti-patterns

| Anti-pattern                          | Why it fails                                                   | Fix |
|---------------------------------------|----------------------------------------------------------------|-----|
| Treating "alerts" as errors           | Alerts are flagged for human review, not auto-fail.            | Block on errors; route alerts to review. |
| Storing the WAVE API key in config    | Key leak; quota theft.                                         | CI secrets only. |
| Running WAVE against production       | API hits load production; possible PII leakage in scan data.   | Staging / pre-prod only. |
| Using WAVE alone                      | Different rule coverage; misses some structural / ARIA issues. | Pair with axe for full coverage. |
| Dismissing "contrast errors"          | They are SC 1.4.3 violations - definite WCAG failures.         | Treat as errors; aggregate via the gate. |

## Limitations

- **Authenticated pages.** The WAVE API scans public URLs only; auth-required
  pages need the Stand-Alone API or the extension manually.
- **SPAs.** URL-based scanning may not match the user's actual journey.
- **Quotas / costs.** The free API tier has limits; high-traffic CI usage
  requires a paid tier.
- **Different rule coverage** than axe / pa11y - complementary, not a
  replacement.

## References

- WAVE - https://wave.webaim.org/
- WAVE API documentation - https://wave.webaim.org/api/
- WebAIM - https://webaim.org/
- W3C WCAG 2.2 - https://www.w3.org/TR/WCAG22/
