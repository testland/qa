# remit - the 78 end-to-end specs

Exported from the runner on 2026-09-15, grouped by what each spec drives.

## Specs that drive two or more services (31)

| Specs | Services                                             |
|------:|------------------------------------------------------|
|     8 | ledger and settlement (amounts, currency exponent, idempotency key) |
|     6 | settlement and payout-rail (batch boundary, cut-off)  |
|     5 | webhook ingress and ledger (replay, ordering)         |
|     5 | fx-service and ledger (rate staleness, rounding)      |
|     4 | dispute service and ledger (reversal, partial)        |
|     3 | statement builder and ledger (period boundary)        |

## Specs that drive one customer journey end to end (25)

checkout, refund, partial refund, payout, payout failure, dispute open,
dispute resolve, statement download, card added, card removed, mandate signed,
mandate cancelled, invoice paid, invoice voided, payout schedule changed,
account closed, account reopened, limit raised, limit hit, fx quote accepted,
fx quote expired, statement emailed, receipt downloaded, refund reversed,
chargeback accepted.

## Specs that drive a single surface (22)

fee percentage maths for the standard tier, volume tier fee is lower than
standard, unknown fee tier is rejected at checkout, fee on a whole-cent
amount, fee percentage rounds half up at the cent, a fractional fee input is
rejected, IBAN format validation on the payee form, IBAN with a lowercase
country code is refused, short IBAN is refused, IBAN with punctuation is
refused, IBAN checksum rejects a transposed pair, receipt line formatting pads
the amount, receipt line is forty characters wide, receipt line wraps at forty
characters, statement amount renders two decimals, yen statement amount renders
no decimals, zero amount renders as zero, currency symbol rendering for JPY,
settlement amount for a two-decimal currency, idempotency key is reference plus
date, malformed currency code is refused, fractional minor amount is refused at
entry.
