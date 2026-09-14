# Password reset - what support saw

- 2026-08-30: backend deploy 7.2.4. `POST /v1/account/reset` starts returning
  500. Measured over the week: it fails for roughly two requests in three.
- The app retries a failed reset once automatically and then shows the
  "Check your email" screen only if a request got through. A customer who taps
  Send three or four times usually gets a link eventually. Most gave up.
- 31 tickets between 2026-08-31 and 2026-09-06. First one escalated 2026-09-06.
- `testResetPasswordSendsEmail` drives the same button once and waits for the
  "Check your email" screen.
