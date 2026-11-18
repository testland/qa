- STAGING_TOKEN is an access token we copy in by hand; tokens expire after 10 minutes.
  Tokens come from POST /auth/token with client_id and client_secret (JSON body), field `access_token`.
- The run takes about 40 minutes; after the first 10 minutes every request gets 401.
- Production bug last month: POST /orders accepted `quantity: -3` and refunded money.
  The spec says `quantity: {type: integer}`.
