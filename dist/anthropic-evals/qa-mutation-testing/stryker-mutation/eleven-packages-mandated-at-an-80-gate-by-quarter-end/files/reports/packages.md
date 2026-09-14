# platform-api — package state, pulled 2026-09-09

Flake rate = share of the last 300 CI runs where the suite failed and then
passed on a rerun of the identical commit.

| Package          | Lines | Line cov | Tests | Suite runtime | Flake rate | What it is                          |
|------------------|-------|----------|-------|---------------|------------|-------------------------------------|
| pricing          | 2,180 | 94.1%    |   206 | 11 s          | 0.0%       | discounts, tiers, proration         |
| tax              | 1,640 | 88.7%    |   174 | 9 s           | 0.3%       | rate lookup and rounding            |
| invoice-render   | 3,910 | 82.4%    |   241 | 34 s          | 0.7%       | PDF and HTML invoice layout         |
| entitlements     | 1,205 | 86.0%    |   139 | 7 s           | 0.0%       | plan to feature mapping             |
| ledger           | 4,320 | 80.9%    |   402 | 58 s          | 1.0%       | double-entry postings               |
| notifications    | 2,050 | 71.2%    |   118 | 21 s          | 2.1%       | email and webhook fan-out           |
| ingest           | 6,740 | 41.3%    |    94 | 46 s          | 1.4%       | partner CSV and JSON import         |
| web-gateway      | 5,110 | 77.8%    |   288 | 22 min        | 7.4%       | HTTP edge, auth, rate limiting      |
| admin-ui         | 8,900 | 63.5%    |   331 | 4 min         | 3.2%       | internal React admin app            |
| migrations       | 1,870 | 12.0%    |    11 | 3 s           | 0.0%       | one-shot SQL migration runners      |
| sdk-codegen      | 2,240 |  0.0%    |     0 | n/a           | n/a        | generates the client SDK from spec  |

Notes:

- `ingest` is 6,740 lines behind 94 tests. The 41% is the honest figure; the
  untested half is partner-specific parsing branches added over two years.
- `web-gateway` reruns are a standing joke. The failures are timing — socket
  teardown and a retry loop — and they land on whichever test is unlucky, not
  on one particular test.
- `migrations` are one-shot scripts, run once against production and then dead.
- `sdk-codegen` has no tests because it has no hand-written code; its output is
  regenerated from the spec on every release.
- Every suite in the table runs on Vitest except `admin-ui`, which is on Jest.
