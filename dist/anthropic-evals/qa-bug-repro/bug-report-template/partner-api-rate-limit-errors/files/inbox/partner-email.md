From:    Kwame Boateng <k.boateng@northlight-systems.example>
To:      devsupport@vantis.example
Sent:    2026-08-13 (no timezone in header - their mail server strips it)
Subject: rate limit errors on the sync endpoint

Hi,

Our nightly sync has been failing against your API since around the start of the
week. We're getting 429 rate limit errors back from the orders endpoint and the
job gives up. We haven't changed anything on our side.

Can you raise our limit? Here's one of the failures, our security team redacted
the host and the key.

  $ curl -i -X POST https://<redacted>/v2/orders/sync \
      -H "Authorization: Bearer <redacted>" \
      -H "Content-Type: application/json" \
      -d @batch-0004.json

  HTTP/1.1 500 Internal Server Error
  date: Wed, 13 Aug 2026 02:14:31 GMT
  content-type: application/json
  x-request-id: req_9f2ac41e0b77
  x-ratelimit-limit: 600
  x-ratelimit-remaining: 47
  x-ratelimit-reset: 1755050400
  retry-after: 0

  {"error":"internal_error","message":"request could not be completed",
   "request_id":"req_9f2ac41e0b77"}

It started at 14:02 the first night and around 2am the other nights. I don't
know exactly how many of the batches fail, the job doesn't log per-batch, it
just reports the run as failed. I'm not on the billing side so I can't tell you
what plan we're on. We're on your Node client, whatever version was current when
we integrated.

Thanks
Kwame
