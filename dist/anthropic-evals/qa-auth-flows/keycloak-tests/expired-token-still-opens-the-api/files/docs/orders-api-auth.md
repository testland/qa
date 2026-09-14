# orders-api - how a request is authorised

The gateway terminates TLS and forwards the caller's `Authorization` header
untouched. `requireAuth` is called before any route handler runs and its result
decides whether the handler is entered at all.

| | |
|---|---|
| SSO server | self-hosted, one container per environment, same image everywhere |
| This service is registered as | confidential client `orders-api` in realm `corp` |
| Its client secret | `SSO_CLIENT_SECRET`, set from the platform secret store in every environment, including local dev via `.env` |
| Who else is in that realm | `corp-portal` (the web UI), `svc-reports`, `mobile-app` |
| Token lifetime | realm default, 300 seconds |
| Suite | `npm test`, no dependencies outside Node |

Open since March: we have never run any of this against a real server. The
stand-in in `test/require-auth.test.js` was written in an afternoon so the
middleware could be unit tested, and it is still the only thing the suite talks
to.
