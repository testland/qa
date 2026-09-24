# SUP-4412 attachment — raw request, logged at Northwind's edge proxy

Endpoint secret Northwind hold, copied out of their dashboard:

    whsec_bm9ydGh3aW5kLXN0YWdpbmctZW5kcG9pbnQta2V5LTE=

Request as received, 2026-09-08 09:20:04 UTC:

    POST /hooks/orders HTTP/1.1
    host: hooks.northwind-logistics.example
    content-type: application/json
    webhook-id: msg_7Qd2rP9xVn4L
    webhook-timestamp: 1788859204
    webhook-signature: v1,fzbzG1sjyXN1uwNVBX/SKOAvAtptIZUnVX11JZAxWw0=

    {"type":"order.created","data":{"id":9071,"total":"148.50","currency":"GBP"}}

Their handler's stack trace, trimmed:

    WebhookVerificationError: No matching signature found
        at Webhook.verify (/app/node_modules/.../webhook.js:88:13)
        at /app/routes/hooks.js:14:20

> To be clear, this is not us failing a comparison and returning 400. The library
> throws. Whatever it computes, nothing in your header matches it.
