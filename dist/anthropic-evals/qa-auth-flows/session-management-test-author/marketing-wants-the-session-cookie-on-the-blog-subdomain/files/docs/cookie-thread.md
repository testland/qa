# #eng-auth, 9-10 September

**Priya (identity), 9 Sep 14:02**

> Google Workspace sign-in is dead for the Northgate accounts. They approve
> consent at accounts.google.com, get bounced to
> `https://app.atlas.example/auth/callback`, and land on the signed-out page
> every single time. Same account, same browser, works if I type the callback
> URL into the address bar. Forty paying seats. I want `sameSite` changed from
> `Strict` to `Lax` in `config/production.json` for Thursday.

**Tom (growth), 10 Sep 09:41**

> Separate ask while somebody is in that file. Put the session cookie on
> `Domain=.atlas.example` so `blog.atlas.example` and `status.atlas.example`
> can tell who is reading and swap the call to action. Ops say the key is
> already in the config so it should be a one-liner. `blog.` is a hosted
> WordPress that Fieldhaus publish into — four of their staff have admin on it
> — and `status.` is a third-party status page. Neither is our infrastructure
> and neither is in our change-control process, before anyone asks.

**Ops, 10 Sep 10:15**

> For the record on how requests land: the load balancer terminates TLS at the
> edge and forwards to the app nodes inside the VPC over plain HTTP, so
> `req.protocol` is `http` on every production request — that is what the
> capture in `src/requests.js` shows. The original proto is in
> `x-forwarded-proto`. Everything in `config/production.json` ships to prod
> as written; `cookieDomain` has been in that file since a subdomain
> experiment in 2025 that was never unwound.
