# RC provider — what their integration page says

- Authorization code lifetime: 60 seconds, **single use**. A code is consumed
  by the first token request that presents it, whatever the outcome.
- Proof-key support: `S256` only. `plain` is not accepted.
- The token endpoint authenticates the client. Credentials may be presented
  either in an `Authorization` header or as `client_id` / `client_secret` form
  fields.
- A confidential client holding a secret may omit the proof key entirely; the
  exchange is then authenticated by the secret alone.
- Access token lifetime: 900 seconds.
- Cutover: the old dev provider is switched off **14 October, 18:00**.
