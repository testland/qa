---
name: rum-to-synthetic-gap-analyzer
description: "Reads Real User Monitoring data (Datadog RUM, Sentry Performance, GA4 Core Web Vitals / CrUX) to identify high-traffic user journeys that have no synthetic monitor coverage: ranks journeys by session volume times business value, diffs the ranked list against existing synthetic monitors, and emits a prioritized gap list ready to feed into synthetic-monitor-author. Use when an observability stack has RUM instrumented but the team suspects synthetic coverage is sparse, biased toward low-traffic paths, or was never systematically derived from real usage data."
rating: 23
d6: 4
---

# rum-to-synthetic-gap-analyzer

## Overview

Synthetic monitors verify journeys that the team *chose* to script. Real User
Monitoring records journeys that users *actually* take. The gap between the two
sets is where production breakage goes undetected: a journey with 40 k sessions
per day but no synthetic monitor can fail silently for hours before on-call is
paged.

This skill closes that gap. It reads RUM journey data, scores each journey by
traffic volume times business value, diffs the result against the team's existing
synthetic monitor inventory, and emits a ranked gap list that
[`synthetic-monitor-author`](../synthetic-monitor-author/SKILL.md) can consume
directly.

## Step 1 - Collect the RUM journey inventory

Pull the top-N view paths (or transaction names) by session volume from the
active RUM source. Aim for the top 50 to avoid chasing long-tail pages that
carry negligible traffic.

### Datadog RUM

In the RUM Explorer (`https://app.datadoghq.com/rum/explorer`):

1. Set event type to **Views**.
2. Group by `@view.url_path` (or `@view.name` for SPAs with named routes).
   Per [Datadog RUM Explorer docs][dd-rum-explorer], "aggregate into groups
   based on the value of one or several event facets" and "extract the count
   of events per group" to get session volume per path.
3. Sort descending by count. Export as CSV or copy the top-50 rows.
4. For each path, also note the p75 LCP / p75 CLS available in the
   Performance Overviews dashboard ([Datadog RUM Dashboards][dd-rum-dash]:
   "See a global view of your website/app performance and demographics").

Query syntax shorthand: `@view.url_path:* | count by @view.url_path | sort desc`.
RUM Explorer supports `key:value` pairs where custom attributes require a
created facet first ([Datadog RUM Search][dd-rum-search]).

[dd-rum-explorer]: https://docs.datadoghq.com/real_user_monitoring/explorer/
[dd-rum-dash]: https://docs.datadoghq.com/real_user_monitoring/platform/dashboards/
[dd-rum-search]: https://docs.datadoghq.com/real_user_monitoring/explorer/search/

### Sentry Performance

Open the **Performance** module and use the **Trace Explorer** to slice by
transaction name. Per [Sentry Transaction Summary docs][sentry-txn], the
platform surfaces throughput as TPM (transactions per minute) and TPS
(transactions per second) per named transaction. Sort by **Total** throughput
to surface highest-volume journeys. Export the table.

[sentry-txn]: https://docs.sentry.io/product/performance/transaction-summary/

### GA4 + CrUX (public-facing sites)

For public pages, the Chrome User Experience Report provides origin-level and
URL-level field data. Per [CrUX methodology][crux-method], pages must be
publicly discoverable (HTTP 200, no `noindex`) and meet a minimum visitor
threshold for statistical confidence; exact threshold is undisclosed. Access
via:

- **CrUX API** (`https://chromeuxreport.googleapis.com/v1/records:queryRecord`)
  for per-URL LCP, INP, CLS distributions.
- **BigQuery** (`chrome-ux-report.all.<YYYYMM>`) for bulk URL-level data.
- **PageSpeed Insights API** for per-URL field vs. lab comparison.

Per [web.dev Core Web Vitals][cwv], the three stable metrics are:

- **LCP** (Largest Contentful Paint): good threshold 2.5 s.
- **INP** (Interaction to Next Paint, replaced FID in 2024): good threshold 200 ms.
- **CLS** (Cumulative Layout Shift): good threshold 0.1.

All thresholds apply at the **75th percentile** of page loads ([web.dev CWV][cwv]).
CrUX field data is "the Google dataset of the Web Vitals program" ([CrUX docs][crux-docs]).

[crux-method]: https://developer.chrome.com/docs/crux/methodology/
[crux-docs]: https://developer.chrome.com/docs/crux
[cwv]: https://web.dev/articles/vitals

## Step 2 - Score each journey

Assign each journey a **coverage-priority score**:

```
coverage_priority = session_volume_score x business_value_score
```

**Session volume score (1-5):** rank by daily session or view count.

| Daily sessions | Score |
|----------------|-------|
| > 10 k         | 5     |
| 1 k - 10 k     | 4     |
| 100 - 1 k      | 3     |
| 10 - 100       | 2     |
| < 10           | 1     |

**Business value score (1-5):** assign by journey type. Adjust to your domain.

| Journey type                              | Score |
|-------------------------------------------|-------|
| Revenue-generating (checkout, upgrade)    | 5     |
| Authentication (login, SSO, MFA)          | 5     |
| Primary feature (core read/write action)  | 4     |
| Onboarding (sign-up, first-run wizard)    | 4     |
| Support / self-service (docs, status)     | 3     |
| Informational (marketing pages, help)     | 2     |
| Admin / internal tooling                  | 1     |

Score range: 1 (low-traffic, low-value) to 25 (highest-traffic, revenue-critical).

For public-facing sites, supplement volume score with CrUX visit share where
available: higher CrUX weight indicates broader real-user exposure.

## Step 3 - Build the existing-monitor inventory

Collect the names or URL patterns of every active synthetic monitor. Most
platforms expose this via API or config file:

- **Datadog Synthetics:** `GET /api/v1/synthetics/tests` returns all tests with
  their `config.request.url` and `type` (browser or api).
- **Checkly:** `checkly tests list --output json` or read `monitors/*.spec.ts`
  and `monitors/*.yml` in the repo.
- **New Relic:** `GET /v2/monitors.json` via NR REST API.
- **Checkly as-code layout** (per [`synthetic-monitor-author`](../synthetic-monitor-author/SKILL.md)):
  `monitors/` directory contains `.spec.ts` (browser) and `.yml` (API) files.

Normalize each monitor to a canonical URL path pattern (strip query strings,
replace ID segments with `{id}`, lowercase). Store as a set.

## Step 4 - Diff: rank the gap list

For each journey in the scored list (Step 2), check whether the normalized path
matches any pattern in the monitor inventory (Step 3).

```
gap_list = [j for j in scored_journeys if not matches_any_monitor(j.path)]
```

Sort `gap_list` descending by `coverage_priority`. The output is the gap list.

### Worked example

```
Scored journeys (top 5):
  /checkout         vol=5, biz=5  -> score 25  [MONITOR EXISTS: checkout-journey.spec.ts]
  /dashboard        vol=5, biz=4  -> score 20  [NO MONITOR]  <-- gap rank 1
  /login            vol=4, biz=5  -> score 20  [MONITOR EXISTS: auth-flow.spec.ts]
  /onboarding/step1 vol=4, biz=4  -> score 16  [NO MONITOR]  <-- gap rank 2
  /reports/{id}     vol=3, biz=4  -> score 12  [NO MONITOR]  <-- gap rank 3

Gap list (ready for synthetic-monitor-author):
  1. /dashboard         score=20  sessions/day=12k  business=primary feature
  2. /onboarding/step1  score=16  sessions/day=5k   business=onboarding
  3. /reports/{id}      score=12  sessions/day=1.2k business=primary feature
```

## Step 5 - Emit the gap report

Output format (Markdown table, one row per gap):

```markdown
| Rank | Journey path       | Sessions/day | Biz value | Score | Recommended monitor type |
|------|--------------------|--------------|-----------|-------|--------------------------|
| 1    | /dashboard         | 12 k         | 4         | 20    | Browser (multi-step)     |
| 2    | /onboarding/step1  | 5 k          | 4         | 16    | Browser (multi-step)     |
| 3    | /reports/{id}      | 1.2 k        | 4         | 12    | Browser (read + assert)  |
```

Recommended monitor type heuristic:

- Score >= 20 and has user interactions: browser check (Playwright-style).
- Score >= 20 and is a pure API endpoint: API check (HTTP steps).
- Score 10-19: browser check if it has a UI; API check otherwise.
- Score < 10: flag for deferred coverage; do not generate a monitor yet.

Pass the gap list to [`synthetic-monitor-author`](../synthetic-monitor-author/SKILL.md)
as the journey input for Step 1 of that skill.

## Hard-reject rule

If no RUM source is available (no Datadog RUM, no Sentry Performance data,
no CrUX data for the target site), halt and return:

```
HALT: no RUM data source available.
Supply at least one of: Datadog RUM Explorer access, Sentry Performance
transaction list, or a CrUX-eligible public origin.
Synthetic coverage gap analysis requires real usage data as input.
```

Do not estimate journey volume from gut feel or static sitemap inspection.
Gap prioritization without usage data produces a monitor list biased by
developer assumptions rather than actual user behavior.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Deriving monitor list from sitemap alone | Sitemap contains every URL, not the ones users visit. High-traffic gaps get buried under low-traffic pages. | Use RUM session volume (Steps 1-2). |
| Treating all uncovered paths equally | A gap on `/checkout` and a gap on `/legal/privacy` are not the same risk. | Apply the coverage-priority score (Step 2). |
| Matching monitor URLs by exact string | `/reports/123` and `/reports/456` are the same journey pattern. Exact match leaves parameterized paths always "uncovered." | Normalize paths before diffing (Step 3). |
| Using CrUX for authenticated pages | CrUX only captures publicly discoverable pages per [CrUX methodology][crux-method]. Authenticated journeys (dashboards, checkout) are invisible. | Use Datadog RUM or Sentry for post-login journeys. |
| Generating monitors for score < 10 | Creates monitor sprawl; low-traffic paths are not worth the maintenance and on-call noise. | Defer to a backlog; re-evaluate when traffic grows. |

## Limitations

- **Datadog RUM session retention is 30 days** per [Datadog RUM Search][dd-rum-search];
  seasonally low periods (holiday shutdowns, pre-launch) may undercount
  volume. Use a representative date range.
- **Sentry samples high-volume transactions** by default; throughput numbers
  from [Sentry Transaction Summary][sentry-txn] (TPM/TPS) reflect sampled
  traces. Check your SDK sample rate before interpreting absolute volumes.
- **CrUX 28-day rolling window** smooths spikes; a newly launched page with
  three weeks of traffic may not yet appear. Use Datadog RUM or GA4 for
  recently launched pages.
- **Business value scores are editorial.** The 1-5 table in Step 2 is a
  starting point, not a formula. Align with product stakeholders before
  the first run and document the agreed values in the gap report header.
- **This skill produces a gap list, not monitors.** Authoring the actual
  monitor configs - script, cadence, assertions, alert thresholds - is the
  responsibility of [`synthetic-monitor-author`](../synthetic-monitor-author/SKILL.md).

## References

- [Datadog RUM Explorer][dd-rum-explorer] - event types, grouping, count aggregation.
- [Datadog RUM Search][dd-rum-search] - `key:value` facet syntax, six core event types.
- [Datadog RUM Dashboards][dd-rum-dash] - Performance Overviews, Usage, Testing and Deployment.
- [Sentry Transaction Summary][sentry-txn] - TPM/TPS throughput, p50/p75/p95, User Misery.
- [CrUX docs][crux-docs] - dataset overview, access methods (API, BigQuery, PageSpeed Insights).
- [CrUX methodology][crux-method] - eligibility criteria, public discoverability requirement.
- [web.dev Core Web Vitals][cwv] - LCP/INP/CLS definitions, good/needs-improvement/poor thresholds, 75th percentile assessment standard.
- [`synthetic-monitor-author`](../synthetic-monitor-author/SKILL.md) - downstream skill: authors the monitor config for each gap identified here.
- ISTQB Glossary V4.7.1 `https://glossary.istqb.org/en_US/term/shift-right` - defines shift right as "A test approach to test a system continuously in production"; this skill feeds that approach by ensuring synthetic coverage reflects real production usage patterns.
