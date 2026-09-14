# Staging capture, 6-10 October — checkout-web against the RC IdP

200 completed logins. Every one of them reached `/auth/callback` with a `code`.

| Outcome of POST /token | Count |
|---|---|
| 200, access token issued  | 52  |
| 400 `invalid_grant`       | 148 |

Same client build, same browser, same code path throughout. Failures are spread
evenly across the five days and across 31 distinct test users. No time-of-day
pattern, no correlation with which IdP node served the request, no correlation
with session length, and both outcomes occur for the same user within minutes
of each other. Our logs redact the verifier and the challenge, so neither value
appears in this capture.

Support desk on the failures, verbatim and in full: "the request does not prove
possession of the verifier." They would not elaborate. The previous IdP
accepted all 200 of these exchanges.
