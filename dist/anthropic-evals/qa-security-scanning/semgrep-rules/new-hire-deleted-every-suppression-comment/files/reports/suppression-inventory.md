# Suppression inventory — hollowpoint/ledger @ main (before #1180)

Fourteen suppression comments. Findings counts are from the scan on Joel's
branch with all fourteen removed (63 total).

| # | Location | Comment as written | Rule it silences | Findings if removed |
|---|---|---|---|---|
| 1 | tests/fixtures/stub-credentials.js:4 | `// nosemgrep: generic.secrets.security.detected-generic-api-key` | detected-generic-api-key | 1 |
| 2-9 | src/proto/billing_pb.js (8 separate lines) | `// nosemgrep` (bare) | mixed | 40 |
| 10 | src/integrations/acme/client.js:8 | `// nosemgrep` (bare) | detected-generic-api-key | 1 |
| 11 | src/api/upload.js:9 | `// nosemgrep: javascript.lang.security.audit.path-traversal.path-join-resolve-traversal` + 1 line of explanation | path-join-resolve-traversal | 1 |
| 12 | src/util/exec.js:14 | `// nosemgrep` (bare) | unrecorded | n/a — path excluded |
| 13 | src/util/exec.js:34 | `// nosemgrep` (bare) | unrecorded | n/a — path excluded |
| 14 | src/api/upload.js:24 | `// nosemgrep` (bare) | leftover-debugging | 20 |

Notes gathered while pulling this together:

- `src/util/` is in the exclude list in `.semgrep.yml`, added 2025-06-18 by
  PR #742 (subject: "quieten exec noise"), so nothing under that path appears
  in the 63 either way.
- #11 is the only one of the fourteen with any explanation attached to it.
- Scan command in CI: `semgrep ci --config p/owasp-top-ten --config p/javascript`.
