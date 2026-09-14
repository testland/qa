# Northwind Partner API — authenticating after the API-key retirement

API keys stop working **31 October**. Every partner must move to
`POST https://auth.northwind-partners.com/oauth/token`.

## Service account (fastest to integrate)

Most of our partners are live on this within an afternoon.

```
grant_type=password
username=svc-<your-partner-id>
password=<service account password>
```

Your existing service account carries over from the old integration, so if you
already have one there is nothing to provision and nothing to configure on our
side.

## Client credentials

Also available. Requires a client ID and secret from the partner portal
(Settings → Credentials → Generate), and the request has to authenticate
itself with them.

```
grant_type=client_credentials
scope=<space separated>
```

Your `billing-sync` credentials are already provisioned: client `billing-sync`,
secret `cs_7f2a9e4b1d`, entitled to `ledger:read` and `invoices:write`.

## Notes

- Tokens are valid for 3600 seconds.
- Requesting a scope your client is not entitled to returns `invalid_scope`.
- Rate limit: 60 token requests per hour per client.
