# Voucher codes - v2, unchanged since 2026-01-19

Four upper-case letters, a hyphen, four digits: `ABCD-0100`.

The **first letter is the tier**. The other three letters are the campaign. The
four digits are the serial and carry no value of their own.

| Tier | Value  |
|------|--------|
| A    | 5.00   |
| B    | 10.00  |
| C    | 25.00  |

Letters D-Z are reserved for partner-minted batches (VOU-889). A code whose tier
we do not price is a well-formed code that is not ours: it must be refused with
a clear error and treated as no voucher. It must never take the request down.
