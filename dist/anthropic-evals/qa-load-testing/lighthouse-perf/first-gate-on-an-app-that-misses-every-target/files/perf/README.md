# Where these numbers come from

- `field_*` columns: 75th percentile over a 28-day window, all devices, from the
  analytics SDK already embedded in the app. 62% of those sessions are mobile.
- `lab_*` columns: median of 3 runs per URL on the merge commit, desktop preset,
  GitHub-hosted runner, week of 2026-09-01 — except `/share/:token`, see below.
- `traffic_share`: fraction of total page loads in the same window.

Route notes:

- `/` and `/pricing` are statically generated and served from the CDN edge. They
  have looked like this for eighteen months.
- `/app/dashboard` is the logged-in landing page. Rewrite scheduled for Q1.
- `/app/reports` fans out to four internal services on load; owned by platform.
- `/app/invoices/new` is the invoice composer. Users type in it continuously and
  it renders a live preview pane beside the form; the preview is what moves the
  layout around while they type.
- `/share/:token` is the public read-only document viewer, shipped 2026-09-04.
  Its row is one run taken on 2026-09-11 on the self-hosted runner while that
  machine was also building the Android app — not a median of three, and nobody
  has repeated it. The analytics SDK is not on this route yet, so there is no
  field column; roughly 1,100 sessions have hit it since launch.
