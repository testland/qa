# Edge log excerpt — scan window 2026-09-08 02:12–02:14 UTC

Filtered to the scanner's source range and user agent.

```
02:12:41 GET /            200 text/html   18.2kB  ua="Mozilla/5.0 (ZAP)"
02:12:41 GET /robots.txt  404 text/plain  0.1kB   ua="Mozilla/5.0 (ZAP)"
02:12:42 GET /sitemap.xml 404 text/plain  0.1kB   ua="Mozilla/5.0 (ZAP)"
02:12:43 GET /login       200 text/html   18.2kB  ua="Mozilla/5.0 (ZAP)"
02:12:44 GET /about       200 text/html   18.2kB  ua="Mozilla/5.0 (ZAP)"
02:12:45 GET /status      200 text/html   18.2kB  ua="Mozilla/5.0 (ZAP)"
02:13:46 -- no further requests from this source until the window closed
```

Notes from whoever pulled this (Tomas, 2026-09-09):

- Every one of those responses is the same 18.2kB document. It is the app
  shell: a `<div id="root">`, one script bundle, and a `<noscript>` block. The
  only `<a href>` elements anywhere in that document are the four in the shell
  header — home, login, about, status.
- `/projects` returns the same 18.2kB shell with a 200. So do
  `/billing/invoices` and `/settings/tokens`. The server does not know or care
  which route was asked for.
- We have no sitemap and `robots.txt` is a 404 on staging.
