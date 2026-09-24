# Two teams start building against this import contract on Monday

## Problem Description

We publish `POST /v2/imports` to partners next quarter. The design doc section
below is the contract two separate teams are about to build against: the
platform team writes the endpoint, and the partner-integrations team writes the
reference client and the partner-facing docs from the same text. They are in
different timezones and they will not be in a room together again before
Monday.

Every sentence in that section is going to be read twice and implemented twice.
Where the sentence pins the behaviour down, both teams land in the same place.
Where it does not, we get two implementations that disagree and we find out
from a partner in six weeks.

Go through the section sentence by sentence and tell me which ones are safe to
hand to two independent teams and which ones are not, and for the unsafe ones
give me the sentence I should put in instead. Be precise about what is wrong
with each one — "needs detail" does not help me decide whether I can fix it in
the doc myself this afternoon or whether I have to get Dana and the partner
team on a call first, and those are very different amounts of my Friday.

Some of what is in there is a product decision I have already made and do not
want relitigated. I need to know whether the sentences can be built and checked
as written, not whether I chose right.

## Output Specification

Write `docs/import-contract-review.md` containing:

1. A top-line call on whether the section is safe to hand over on Monday.
2. How many sentences you assessed and how many of them are not safe.
3. A row per problem sentence: the sentence, what is wrong with it, how bad it
   is, and the exact replacement text.
4. Anywhere the fix is not something you can write yourself, say who or what
   the sentence needs to go to.

Do not modify `docs/import-contract.md`.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/import-contract.md ===============
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

=============== FILE: docs/partner-faq-draft.md ===============
# Partner FAQ — draft, do not review

**How big can one import be?**
Up to 10,000 rows.

**What happens to bad rows?**
They are skipped and reported. The rest of the file still goes in.

**How do I know when it is done?**
We call your `callback_url`.
