# Swapping the invoice renderer, and the old bug list is what scares me

## Problem Description

We are replacing the library that renders customer invoices as PDFs. The
invoice content, the templates and the numbers are unchanged; only the
rendering engine underneath is different. The team's position is that this
is a no-op for customers.

I do not believe that, because I have the defect history. Over four years
we fixed twenty-something rendering bugs against the old engine - long
company names overflowing the header, negative amounts losing their minus
sign in the totals block, a Japanese address wrapping into the fold line,
tax-summary rows silently truncated past twelve. Each of those was found in
production by a customer. The new engine knows about none of them.

Marc has two 60-minute blocks next Tuesday and one more the following week
if we need it. He is not going to look at anything new - the redesigned
invoice template and the new payment-link block are behind a flag, are not
part of this swap, and are being handled separately.

What I want out of Tuesday is a defensible answer to "is this a no-op",
and, if it is not, a clear statement of where to point the third block.

## Output Specification

Produce a single file: `docs/qa/invoice-renderer-blocks.md`.

It must contain:

1. One stated objective per block: the area, what Marc compares against,
   and what we need to know by the end.
2. How the closed-defect history is used as the standard of comparison,
   including which historical defects are worked first and why.
3. What else is compared beyond the historical list - the plan must not be
   only a re-run of old defects.
4. What Marc records in a block, split so a reader can separate a genuine
   regression, a difference that is visible but acceptable, and a question
   for the finance or product owner.
5. The hand-back at the end of each block, including how a finding is tied
   back to what it relates to so the next person can pick it up, and the
   named target for the third block if we need one.
6. What is deliberately not looked at.

Budget: two 60-minute blocks on Tuesday, a possible third the week after.
Out of scope: the redesigned template behind the flag, the payment-link
block, invoice content and calculations, and email delivery.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/renderer-swap.md ===============
# Invoice renderer swap

**Change:** replace the PDF rendering library. Templates, data and
calculations unchanged. Output is expected to be visually equivalent.

## What differs between engines, per the dev spike

- Font fallback for CJK and Cyrillic glyphs is handled by the OS font stack
  in the new engine rather than bundled fonts.
- Text overflow: the old engine clipped, the new engine shrinks to fit down
  to a floor and then clips.
- Table pagination is computed differently; rows that previously split
  across a page boundary may now push whole.
- Number formatting is delegated to the platform locale library rather than
  the template.
- Page footers with the "page N of M" counter are drawn in a second pass.

## Closed rendering defects against the old engine (extract)

| Ref | Symptom | Closed |
|---|---|---|
| INV-204 | Company names over 42 chars overflow the header box | 2022 |
| INV-311 | Negative total renders without the minus sign | 2022 |
| INV-402 | Japanese address wraps into the fold line on window envelopes | 2023 |
| INV-455 | Tax summary silently truncates past 12 rows | 2023 |
| INV-509 | Zero-amount line items dropped from the table entirely | 2023 |
| INV-588 | Credit note reuses the invoice header wording | 2024 |
| INV-640 | Multi-page invoice repeats the totals block on every page | 2024 |
| INV-701 | Currency symbol placement wrong for CHF and SEK | 2025 |
| INV-733 | Footer page counter shows "page 1 of 1" on 3-page invoices | 2025 |
| INV-780 | Cyrillic customer names render as boxes | 2025 |

## Test resources

- Staging can regenerate any historical invoice by id against either engine.
- A set of 40 real anonymised invoices covering 9 currencies and 6 scripts
  is available in the QA bucket, including the originals from the defects
  above.
- No automated visual comparison exists for invoices; comparison is by eye.
