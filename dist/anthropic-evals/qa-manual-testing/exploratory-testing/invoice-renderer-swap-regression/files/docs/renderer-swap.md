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
