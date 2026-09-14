# Staging auth, after the 2026-09-02 rotation

Bearer tokens are minted at `POST /v1/auth/token` with HTTP Basic credentials.

What changed on 2026-09-02:

| Property        | Before            | After             |
|-----------------|-------------------|-------------------|
| Token lifetime  | 24 hours          | 10 minutes        |
| Mint endpoint   | rate limited 30/min | rate limited 30/min |
| Refresh endpoint| did not exist     | `POST /v1/auth/refresh`, not rate limited |

The short lifetime is deliberate - staging shares an identity provider with
production and security would not sign off on long-lived tokens there any more.
`POST /v1/auth/refresh` takes the current token and returns a new one with a
fresh 10 minutes. It is not rate limited and it is the intended path for any
long-running client.

Staging is torn down and rebuilt from a seed dump every night at 01:00 UTC.
Nothing written to staging by a test survives the rebuild, and no team is asked
to clean up after itself there.
