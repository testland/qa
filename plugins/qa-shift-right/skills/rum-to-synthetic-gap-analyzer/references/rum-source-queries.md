# RUM source queries

Per-source instructions for pulling the top-N journey inventory (Step 1 of
`rum-to-synthetic-gap-analyzer`). Aim for the top 50 view paths (or transaction
names) by session volume to avoid chasing long-tail pages with negligible traffic.

## Datadog RUM

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

## Sentry Performance

Open the **Performance** module and use the **Trace Explorer** to slice by
transaction name. Per [Sentry Transaction Summary docs][sentry-txn], the
platform surfaces throughput as TPM (transactions per minute) and TPS
(transactions per second) per named transaction. Sort by **Total** throughput
to surface highest-volume journeys. Export the table.

[sentry-txn]: https://docs.sentry.io/product/performance/transaction-summary/

## GA4 + CrUX (public-facing sites)

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
