# #eng-auth, 9-10 September

**Priya (identity), 9 Sep 14:02**

> Google Workspace sign-in is dead for the Northgate accounts. They approve
> consent at accounts.google.com, get bounced to
> `https://app.atlas.example/auth/callback`, and land on the signed-out page
> every single time. Same account, same browser, works if I type the callback
> URL into the address bar. Forty paying seats. I want `sameSite` changed from
> `Strict` to `Lax` in `config/production.json` for Thursday.
>
> Capture of the hop that fails, from her browser:
>
> ```
> GET /auth/callback?code=4%2F0AX4…&state=9f21…
>   > host: app.atlas.example
>   > referer: https://accounts.google.com/
>   > sec-fetch-site: cross-site
>   > sec-fetch-mode: navigate
>   > sec-fetch-dest: document
>   < 302 Location: /sign-in?next=%2F
> ```

**Tom (growth), 10 Sep 09:41**

> Separate ask while somebody is in that file. I want `blog.atlas.example` and
> `status.atlas.example` to be able to read the session cookie so they can tell
> who is reading and swap the call to action. Ops say there is already a domain
> key in the config, so I am told this is a one-liner and I have promised it
> for Thursday.

**Ops, 10 Sep 10:15**

> Inventory is attached for whoever picks this up. No opinion from us on either
> ask; we just host the things.
