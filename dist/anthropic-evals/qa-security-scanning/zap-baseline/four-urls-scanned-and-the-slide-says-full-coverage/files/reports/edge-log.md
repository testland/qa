# Edge log excerpt — scan window 2026-09-08 02:12–02:16 UTC

Filtered to the scanner's source range and user agent. Unedited.

```
02:12:41 GET /            200 text/html     612  ua="Mozilla/5.0 (ZAP)"
02:12:41 GET /robots.txt  404 text/plain    112  ua="Mozilla/5.0 (ZAP)"
02:12:42 GET /sitemap.xml 404 text/plain    112  ua="Mozilla/5.0 (ZAP)"
02:12:43 GET /login       200 text/html     612  ua="Mozilla/5.0 (ZAP)"
02:12:44 GET /about       200 text/html     612  ua="Mozilla/5.0 (ZAP)"
02:12:45 GET /status      200 text/html     612  ua="Mozilla/5.0 (ZAP)"
02:13:46 -- no further requests from this source until the window closed
```

For comparison, three paths fetched by hand from the same edge, 2026-09-09:

```
14:02:10 GET /projects          200 text/html    612  ua="curl/8.6.0"
14:02:14 GET /billing/invoices  200 text/html    612  ua="curl/8.6.0"
14:02:19 GET /settings/tokens   200 text/html    612  ua="curl/8.6.0"
```

The document returned at `/` on 2026-09-09, in full:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Northvale</title>
    <link rel="stylesheet" href="/assets/app-8f21c4.css" />
  </head>
  <body>
    <header>
      <a href="/">Northvale</a>
      <a href="/about">About</a>
      <a href="/status">Status</a>
      <a href="/login">Sign in</a>
    </header>
    <div id="root"></div>
    <noscript>This application requires JavaScript.</noscript>
    <script type="module" src="/assets/app-8f21c4.js"></script>
  </body>
</html>
```
