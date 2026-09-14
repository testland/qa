# German launch 2026-09-01 - what got through

| # | Surface                  | What the user saw                        |
|---|--------------------------|------------------------------------------|
| 1 | Billing, confirm control | "Zahlungsmethode bestaeti..." (clipped)  |
| 2 | Invoices, export control | "Alle Rechnungen exporti..." (clipped)   |
| 3 | Invoice CSV download     | "R?ckerstattung" where the German invoice line reads "Rueckerstattung" with an u-umlaut |

Notes:

- The readiness job was green on the release commit `b4419de` and on all 190
  commits before it. No key has ever been reported as overflowing.
- The German strings came back from the vendor on 2026-08-19 and a native
  speaker read them through. The translations are correct; the console is not.
- Defect 3 reproduces on any invoice line carrying a character outside ASCII.
  The same invoice renders correctly in the web console and garbles only in the
  downloaded file. Finance has spent the week pasting the file into a
  spreadsheet and repairing rows by hand.
- The CI log shipper also drops lines containing characters outside ASCII, which
  is why the export job's own failure output has been unreadable all week.
