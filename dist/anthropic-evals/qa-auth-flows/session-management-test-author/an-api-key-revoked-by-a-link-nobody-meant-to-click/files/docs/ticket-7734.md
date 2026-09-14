# Ticket 7734 — "I did not revoke that key"

**W. Mbeki, Cranmere Logistics, 3 Sep 11:26**

> Our production integration key `k_8812` stopped working at 09:58 this
> morning. Nobody on our team revoked it — we have two people with access to
> that page and neither was logged in. The only thing I did around then was
> open a link in an email that said it was a Ledgerly invoice. It went to a
> blank page so I closed it. Is `k_9043` safe? That one is running payroll.

**Access log, the session in question, 3 September**

```
09:41:02 GET /account/keys            200 sid=1e6b...
         sec-fetch-site: same-origin
         sec-fetch-mode: cors
         sec-fetch-dest: empty

09:58:04 GET /account/keys/revoke?id=k_8812  200 sid=1e6b...
         referer: https://mail.google.com/
         sec-fetch-site: cross-site
         sec-fetch-mode: navigate
         sec-fetch-dest: document
         user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ... Chrome/141
```

**Dev thread**

> **Owen, 4 Sep 10:12** — We set `SameSite=Lax` on `sid`. A cross-site request
> cannot carry the session cookie, so whatever this was, it was not somebody
> else's page driving his browser. More likely their own automation with a
> stored cookie. And Aurelia's three findings are the same false positive
> three times.
>
> **Mira, 4 Sep 10:31** — If we have to satisfy Aurelia regardless, the cheap
> version is to render the token into the link as `?csrf=<token>` and reject
> the request when the parameter is absent. One afternoon. No change to the
> email templates or the mobile app, which both build those URLs themselves
> and neither of which can send a custom header. It is the same token either
> way, so I do not see what we lose.
