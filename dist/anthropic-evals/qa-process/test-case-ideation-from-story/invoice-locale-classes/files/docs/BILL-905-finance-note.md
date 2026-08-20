# Finance note — what the invoice has to satisfy

We bill in USD, EUR, GBP, CHF and JPY. JPY has no minor unit; amounts are whole
yen and rounding happens at the line level.

Interface languages currently shipped: English, German, French, Japanese and
Arabic. Arabic customers read the invoice right-to-left. Customer billing names
and addresses are stored as the customer typed them, so a Japanese company name
can appear on an invoice whose interface language is English.

Tax handling:

- Domestic sales carry the local VAT or sales tax rate.
- EU cross-border business sales with a valid VAT number are reverse charge:
  0.00 tax, and the invoice must carry the reverse-charge statement and both
  VAT numbers.
- Customers without a VAT number are charged their local rate.
- A 0% rate and an exemption are different things and must not print the same
  label.

Due date is invoice date plus 14 days. Our legal entities are in Ireland and
Singapore, and customers are worldwide.
