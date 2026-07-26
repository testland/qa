# ZAP OAuth / Bearer token injection

Per [zap-auth], ZAP exposes three environment variables for header-based
authentication injection - useful for pre-obtained bearer tokens (OAuth
client-credentials flow, API keys, CI-issued JWTs):

| Variable | Purpose |
|---|---|
| `ZAP_AUTH_HEADER_VALUE` | The token value (`Bearer eyJ...`) |
| `ZAP_AUTH_HEADER` | Header name (defaults to `Authorization` if unset) |
| `ZAP_AUTH_HEADER_SITE` | Restrict injection to this domain only |

Set these in the CI environment before running the scan:

```bash
export ZAP_AUTH_HEADER_VALUE="Bearer $(./scripts/get-ci-token.sh)"
export ZAP_AUTH_HEADER_SITE="app.example.com"

docker run --rm \
  -e ZAP_AUTH_HEADER_VALUE \
  -e ZAP_AUTH_HEADER_SITE \
  -v $(pwd):/zap/wrk/:rw \
  ghcr.io/zaproxy/zaproxy:stable \
  zap-full-scan.py -t https://app.example.com -n /zap/wrk/context.xml -J report.json
```

For OAuth flows requiring a full authorization-code exchange, use Script-Based
auth ([references/script-based-auth.md](script-based-auth.md)) to run the
exchange inside ZAP and let ZAP manage token refresh during the scan.
Environment-variable injection is the right path for client-credentials and
static-API-key auth.

[zap-auth]: https://www.zaproxy.org/docs/desktop/start/features/authentication/
