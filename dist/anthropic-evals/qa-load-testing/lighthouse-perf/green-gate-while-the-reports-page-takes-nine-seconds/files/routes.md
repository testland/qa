# Route inventory

| Path                | What it is                         | Auth       | Notes |
|---------------------|------------------------------------|------------|-------|
| `/`                 | Marketing home, statically built   | public     | CDN-cached. |
| `/pricing`          | Marketing pricing                  | public     | CDN-cached. |
| `/app/dashboard`    | Logged-in landing, 6 summary tiles | logged-in  | Redirects to `/login` without a session cookie. |
| `/app/reports`      | The report builder and viewer      | logged-in  | Redirects to `/login` without a session cookie. Loads the charting bundle, then fetches up to 90 days of series data. All fourteen tickets are about this page. |
| `/app/exports/new`  | Export request form, 11 fields     | logged-in  | Redirects to `/login` without a session cookie. Live validation on every field. |
| `/docs/*`           | Long-form help articles, MDX       | public     | CDN-cached. |
