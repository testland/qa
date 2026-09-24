# German launch 2026-09-01 - what got through

| # | Surface                  | What the user saw                                             |
|---|--------------------------|---------------------------------------------------------------|
| 1 | Billing, confirm control | "Zahlungsmethode jetzt bestä..." (clipped)                    |
| 2 | Invoices, export control | "Alle Rechnungen exporti..." (clipped)                        |
| 3 | Invoice CSV download     | "R?ckerstattung" where the invoice line reads "Rückerstattung" |

The vendor file, delivered 2026-08-19 and read through by a native speaker. The
translations are correct; the console is not.

| Key              | English (len)               | German                           | len |
|------------------|-----------------------------|----------------------------------|-----|
| billing.confirm  | Confirm payment method (22)  | Zahlungsmethode jetzt bestätigen | 32  |
| billing.cancel   | Cancel (6)                   | Abbrechen                        | 9   |
| billing.plan     | Current plan (12)            | Aktueller Tarif                  | 15  |
| invoice.download | Download invoice (16)        | Rechnung herunterladen           | 22  |
| invoice.export   | Export all invoices (19)     | Alle Rechnungen exportieren      | 27  |
| nav.settings     | Settings (8)                 | Einstellungen                    | 13  |
| nav.billing      | Billing (7)                  | Abrechnung                       | 10  |

Notes:

- The readiness job was green on the release commit `b4419de` and on all 190
  commits before it. No key has ever been reported as overflowing.
- The download link came out at exactly its budget in German, with nothing to
  spare, which is the only reason it is not on the escape list.
- Ivan spent an afternoon on the check in July and left a note on the ticket:
  "took the normalising step out to see what happened - four of the seven keys
  came back over budget, including Aktueller Tarif, which fits with three
  characters to spare in the real German. It cannot tell a real overflow from
  its own padding, so I put it back."
- Defect 3 reproduces on any invoice line carrying a character outside ASCII.
  The same invoice reads correctly in the web console and garbles only in the
  downloaded file. We asked the vendor to resend the file; the resent file
  behaves exactly the same. Finance has spent the week repairing rows by hand.
