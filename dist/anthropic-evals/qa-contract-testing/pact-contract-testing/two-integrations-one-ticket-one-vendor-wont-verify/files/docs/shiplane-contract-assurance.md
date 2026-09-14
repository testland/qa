# Shiplane Contract Assurance - product page, saved 2026-09-09

> **Never be surprised by an API change again.**
>
> Upload your expectation file through the Shiplane developer portal. Our
> replay service executes every interaction in it against **your sandbox
> account** and returns a signed pass/fail report, per interaction, within
> minutes. Re-run it on demand from the portal or from our REST API.
>
> **$400 / month.** Included: unlimited replays, 90 days of report history,
> email alerting on a failed replay.

## Notes from the page's own FAQ

- **Which environment does the replay run against?**
  Your sandbox account on `sandbox.shiplane.com`. Production accounts are not
  reachable by the replay service.
- **How current is the sandbox?**
  The sandbox environment is refreshed from the production build on the first
  Tuesday of each month. Customers who need earlier access to an upcoming change
  should contact their account manager.
- **What is in the report?**
  Per-interaction pass or fail, the response body observed, and a timestamp. The
  report is delivered to you as JSON and PDF. Reports are not pushed to any
  third-party system.
- **Do you version the API?**
  The `/v2` prefix is stable. Release notes are published to the changelog after
  each production release.
