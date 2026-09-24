# Unsolicited disclosure — privacy behaviour of hellogrid.example

Received 2026-09-05. Reproduced twice by the reporter, once by our on-call.

I browse with an extension that expresses my opt-out preference automatically on
every request I make, to every site. I have never interacted with your banner and
I have never accepted or dismissed anything of yours. You loaded vendor scripts
that share what I do with third parties anyway.

## The request as my browser sent it

    GET /pricing HTTP/1.1
    Host: hellogrid.example
    Accept: text/html,application/xhtml+xml
    Accept-Language: en-US,en;q=0.9
    Cache-Control: no-cache
    DNT: 1
    Sec-GPC: 1
    Upgrade-Insecure-Requests: 1
    User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)

## Scripts in the response for that page

    app.js
    consent-banner.js
    analytics-share.js
    ads-third-party.js

## The booking widget you embed on the same page

    embed.js
    analytics-share.js
    partner-audience.js

Please tell me what you intend to do.
