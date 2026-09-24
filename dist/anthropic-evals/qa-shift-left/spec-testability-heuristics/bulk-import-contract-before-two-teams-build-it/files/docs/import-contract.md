# Design doc — section 4, `POST /v2/imports`

`POST /v2/imports` accepts a JSON body of up to 10,000 rows per request and
responds `202` with a `job_id`; a body carrying more than 10,000 rows is
rejected with `413` and no job is created.

Note: we picked 10,000 because the largest partner's current nightly CSV is
8,400 rows and doubling it gave us room without forcing pagination into v2.

The endpoint returns an error when the payload is invalid.

Rows that fail validation are skipped rather than retried and are listed in
`GET /v2/imports/{job_id}/errors` with `row_number` and `code`; the job still
reports `status: "succeeded"` as long as at least one row imported.

Rows whose `sku` already exists are updated in place instead of inserted.

When the job finishes we `POST` to the partner's configured `callback_url` with
`{job_id, status, processed, failed}` and an `X-Signature` header carrying the
HMAC-SHA256 of the raw body keyed on that partner's webhook secret, and delivery
is reliable.

The import should feel fast for a partner uploading their first catalogue.
