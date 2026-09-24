# Northwind Partner API — authenticating after the API-key retirement

API keys stop working **31 October**. Every partner must move to
`POST https://auth.northwind-partners.com/oauth/token`.

## Client credentials

```
grant_type=client_credentials
scope=<space separated>
```

The request authenticates itself with the client ID and secret issued in the
partner portal (Settings, then Credentials). Your `billing-sync` credentials
are client `billing-sync`, secret `cs_7f2a9e4b1d`, entitled to `ledger:read`
and `invoices:write`.

## Service accounts

Legacy. Still accepted for partners on the 2021 reporting integration. No new
service accounts are being issued.

## Notes

- Tokens are valid for 3600 seconds.
- The endpoint issues what your client is entitled to. A scope you are not
  entitled to is left out of the response; the request itself is not rejected.
- Rate limit: 60 token requests per hour per client.
- Reading the ledger needs `ledger:read`. Posting an invoice needs
  `invoices:write`.
- Entitlements are changed in the partner portal by your account owner, or by
  us on request.
