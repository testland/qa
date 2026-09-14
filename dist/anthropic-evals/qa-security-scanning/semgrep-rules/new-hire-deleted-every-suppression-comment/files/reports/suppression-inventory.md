# Suppression inventory — hollowpoint/ledger @ main (before #1180)

Fourteen suppression comments, grouped. Findings counts are from the scan on
Joel's branch with all fourteen removed (63 total).

| # | Location | Comment as written | Rule it silences | Findings if removed |
|---|---|---|---|---|
| 1 | tests/fixtures/stub-credentials.js:7 | `// nosemgrep: generic.secrets.security.detected-generic-api-key` | detected-generic-api-key | 1 |
| 2-9 | src/proto/billing_pb.js (8 separate lines) | `// nosemgrep` (bare) | mixed; file is code-generated | 40 |
| 10 | src/integrations/acme/client.js:9 | `// nosemgrep` (bare) | detected-generic-api-key | 1 |
| 11 | src/api/upload.js:22 | `// nosemgrep: javascript.lang.security.audit.path-traversal.path-join-resolve-traversal` + 3 justification lines | path-join-resolve-traversal | 1 |
| 12 | src/util/exec.js:14 | `// nosemgrep` (bare) | detect-child-process (and everything else on that line) | 2 |
| 13-14 | src/api/upload.js:44, src/util/exec.js:31 | `// nosemgrep` (bare) | leftover-debugging | 18 |

Notes gathered while pulling this together:

- `src/proto/billing_pb.js` is emitted by `protoc` on every build; the header
  says "DO NOT EDIT". The eight comments were hand-added in 2024 and the file
  has been regenerated 200+ times since, so they survive only because whoever
  added them patched the generator template.
- #11 is the only one with any explanation attached to it at all.
- #1's file header documents the value as a throwaway used by the auth stubs.
