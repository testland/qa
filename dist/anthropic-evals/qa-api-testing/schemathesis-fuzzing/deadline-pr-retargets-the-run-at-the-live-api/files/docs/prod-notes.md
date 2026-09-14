# Production - notes the platform team asks reviewers to check against

- Scope `read:*` maps to every GET operation in the gateway config. That
  includes `GET /v1/exports/{id}/download`, which records a metered billing
  event per call: the customer is invoiced per export download.
- `GET /v1/statements/{id}/pdf` renders on demand and holds one of 12 render
  workers for up to 9 seconds.
- On-call pages on a 5xx rate above 0.5% over 2 minutes, any endpoint, with no
  suppression window.
