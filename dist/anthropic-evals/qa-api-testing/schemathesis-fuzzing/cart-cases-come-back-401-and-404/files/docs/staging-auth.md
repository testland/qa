# Staging auth and data notes

- `POST /v1/sessions` returns an access token. **Token lifetime is 5 minutes**
  on staging (15 in production). `POST /v1/sessions/refresh` takes the refresh
  token and returns a new access token; the refresh token lasts 12 hours.
- The login endpoint is rate limited to 30 requests per minute per source IP.
  Exceeding it returns 429 for the next minute. This limit is on `/v1/sessions`
  only; refresh is not limited.
- The staging database is dropped and recreated from migrations every night at
  02:00 UTC. It holds no real customer data and nothing in it is retained.
  Writing rows to staging costs nothing and QA is not asked to clean up.
- Do not commit a long-lived token to the repository. The security team revokes
  any token that appears in a commit and files it as an incident.
